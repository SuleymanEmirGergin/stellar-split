import { useState, useCallback } from 'react';
import { GoogleGenerativeAI, type Tool, SchemaType } from '@google/generative-ai';
import { useAppStore } from '../store/useAppStore';
import * as contract from '../lib/contract';
import { useToast } from '../components/Toast';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PendingAction {
  name: string;
  args: Record<string, any>;
}

const AGENT_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'add_expense',
        description: 'Bir gruba yeni bir harcama ekler.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            groupId: { type: SchemaType.NUMBER, description: "Grubun ID'si" },
            amount: { type: SchemaType.NUMBER, description: 'Harcama miktarı (örn: 10.5 XLM)' },
            description: { type: SchemaType.STRING, description: 'Harcama açıklaması' },
            payer: { type: SchemaType.STRING, description: 'Ödeyen kişinin Stellar adresi (G...)' },
            splitAmong: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: 'Harcamanın bölüştürüleceği Stellar adresleri',
            },
          },
          required: ['groupId', 'amount', 'description', 'payer', 'splitAmong'],
        },
      },
      {
        name: 'create_group',
        description: 'Yeni bir harcama bölüşme grubu oluşturur.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: 'Grubun adı' },
            members: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: 'Grup üyelerinin Stellar adresleri',
            },
          },
          required: ['name', 'members'],
        },
      },
      {
        name: 'get_balances',
        description: 'Mevcut grubun borç/alacak durumunu sorgular.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            groupId: { type: SchemaType.NUMBER, description: "Grubun ID'si" },
          },
          required: ['groupId'],
        },
      },
    ],
  },
];

export function useAIAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const walletAddress = useAppStore((s) => s.walletAddress);
  const { addToast } = useToast();

  const handleToolCall = useCallback(async (name: string, args: Record<string, any>) => {
    if (name === 'get_balances') {
      try {
        const balances = await contract.getBalances(walletAddress, args.groupId);
        let balanceText = "İşte grubun bakiye durumu:\n";
        for (const [addr, bal] of balances.entries()) {
          const amount = (bal / 10_000_000).toFixed(2);
          balanceText += `• ${addr.slice(0, 4)}...${addr.slice(-4)}: ${amount} XLM\n`;
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: balanceText }]);
        return;
      } catch (err) {
        console.error('Balance error:', err);
        setMessages((prev) => [...prev, { role: 'assistant', content: "Bakiyeleri getirirken bir hata oluştu." }]);
        return;
      }
    }

    setPendingAction({ name, args });
    
    let confirmationMsg = "";
    if (name === "add_expense") {
      confirmationMsg = `"${args.description}" için ${args.amount} XLM harcamasını Grup #${args.groupId}'e eklememi onaylıyor musun? (Evet/Hayır)`;
    } else if (name === "create_group") {
      confirmationMsg = `"${args.name}" adında bir grup oluşturmamı onaylıyor musun? (Evet/Hayır)`;
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: confirmationMsg }]);
  }, [walletAddress]);

  const confirmAction = useCallback(async () => {
    if (!pendingAction) return;
    setIsLoading(true);
    const { name, args } = pendingAction;
    setPendingAction(null);

    try {
      if (name === 'create_group') {
        const id = await contract.createGroup(walletAddress, args.name, args.members);
        setMessages((prev) => [...prev, { role: 'assistant', content: `Başarılı! Grup #${id} oluşturuldu. 🎉` }]);
        addToast("Grup başarıyla oluşturuldu!", "success");
      } else if (name === 'add_expense') {
        const stroops = Math.round(Number(args.amount) * 10_000_000);
        await contract.addExpense(
          walletAddress,
          args.groupId,
          args.payer,
          stroops,
          args.splitAmong,
          args.description
        );
        setMessages((prev) => [...prev, { role: 'assistant', content: "Harcama başarıyla eklendi! ✅" }]);
        addToast("Harcama başarıyla eklendi!", "success");
      }
    } catch (err: any) {
      console.error('Contract action error:', err);
      const msg = err.message || "İşlem sırasında bir hata oluştu.";
      setMessages((prev) => [...prev, { role: 'assistant', content: `Hata: ${msg}` }]);
      addToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [pendingAction, walletAddress, addToast]);

  const sendMessage = useCallback(
    async (text: string, currentGroupId?: number) => {
      if (pendingAction) {
        const normalized = text.toLowerCase().trim();
        if (["evet", "yes", "ok", "onay", "tamam", "e"].includes(normalized)) {
          setMessages((prev) => [...prev, { role: 'user', content: text }]);
          await confirmAction();
          return;
        } else if (["hayır", "no", "iptal", "h"].includes(normalized)) {
          setPendingAction(null);
          setMessages((prev) => [
            ...prev,
            { role: 'user', content: text },
            { role: 'assistant', content: "Tamam, işlemi iptal ettim. Başka bir şey yapabilir miyim?" }
          ]);
          return;
        }
      }

      if (!API_KEY) {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: text },
          {
            role: 'assistant',
            content: 'Hata: VITE_GEMINI_API_KEY tanımlanmamış. Lütfen .env dosyanıza ekleyin.',
          },
        ]);
        return;
      }

      setIsLoading(true);
      const userMessage: Message = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          tools: AGENT_TOOLS,
          systemInstruction: `Sen Stellar Split asistanısın. Kullanıcıların harcama eklemesine ve grup oluşturmasına yardımcı olursun.
Kullanıcı adresi: ${walletAddress || 'Bilinmiyor'}
Mevcut Grup ID: ${currentGroupId ?? 'Yok'}

Kurallar:
1. Doğal ve yardımsever ol. Türkçe cevap ver.
2. Harcama eklemek (add_expense) veya grup oluşturmak (create_group) için tool çağrısı yap.
3. Eksik bilgi varsa (miktar, kişiler, grup adı) soru sor.
4. Stellar adresleri "G..." ile başlar.
5. Kullanıcı "bakiyemi göster" veya "borcum ne" derse get_balances tool'unu çağır.`,
        });

        const history = messages.map((m) => ({
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(text);
        const response = await result.response;

        const calls = response.functionCalls();
        if (calls && calls.length > 0) {
          const [call] = calls;
          await handleToolCall(call.name, call.args);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: response.text() },
          ]);
        }
      } catch (error) {
        console.error('AI Error:', error);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, walletAddress, pendingAction, confirmAction, handleToolCall],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
  }, []);

  return { messages, sendMessage, isLoading, clearChat };
}
