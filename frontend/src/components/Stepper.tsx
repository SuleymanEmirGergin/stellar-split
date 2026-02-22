interface Step {
  label: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
}

interface Props {
  steps: Step[];
}

export default function Stepper({ steps }: Props) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-4 group">
          <div className="relative flex flex-col items-center">
            {/* Circle */}
            <div className={`
              w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10 transition-all duration-300
              ${step.status === 'complete' ? 'bg-green-500 border-green-500 text-white' : 
                step.status === 'loading' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 animate-pulse-ring' :
                step.status === 'error' ? 'bg-destructive border-destructive text-white' :
                'bg-muted border-border text-muted-foreground'}
            `}>
              {step.status === 'complete' ? '✓' : i + 1}
            </div>
            
            {/* Connector Line */}
            {i < steps.length - 1 && (
              <div className={`
                w-0.5 h-8 transition-colors duration-300
                ${step.status === 'complete' ? 'bg-green-500' : 'bg-border'}
              `} />
            )}
          </div>
          
          <div className="flex-1 pb-4">
            <div className={`text-sm font-semibold transition-colors duration-300 ${
              step.status === 'loading' ? 'text-indigo-400' : 
              step.status === 'complete' ? 'text-foreground' : 
              'text-muted-foreground'
            }`}>
              {step.label}
            </div>
            {step.status === 'loading' && (
              <div className="text-[10px] text-indigo-400/70 mt-0.5 animate-pulse">
                İşlem bekleniyor...
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
