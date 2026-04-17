/**
 * DTO Sanitization & Validation Tests
 *
 * Tests that @Transform(strip HTML) + @IsString/@MinLength/@MaxLength
 * behave correctly when ValidationPipe (transform: true) is active.
 *
 * Uses plainToInstance + validateSync — the same chain ValidationPipe
 * runs for every incoming request.
 */

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateGroupDto, GroupCurrency } from './create-group.dto';
import { UpdateGroupDto } from './update-group.dto';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function transform<T extends object>(cls: new () => T, plain: object): Promise<T> {
  const instance = plainToInstance(cls, plain);
  return instance;
}

async function errors<T extends object>(cls: new () => T, plain: object): Promise<string[]> {
  const instance = plainToInstance(cls, plain);
  const errs = await validate(instance as object);
  return errs.flatMap((e) => Object.values(e.constraints ?? {}));
}

// ─── CreateGroupDto — @Transform XSS stripping ───────────────────────────────

describe('CreateGroupDto — @Transform sanitization', () => {
  it('trims leading and trailing whitespace from name', async () => {
    const dto = await transform(CreateGroupDto, {
      name: '  Holiday Trip  ',
      currency: GroupCurrency.XLM,
    });
    expect(dto.name).toBe('Holiday Trip');
  });

  it('strips script tags but leaves inner text (tag-only removal)', async () => {
    // @Transform strips <tag> patterns; inner content is preserved as plain text.
    // "alert(1)" is harmless as a stored string — it won't execute without surrounding tags.
    const dto = await transform(CreateGroupDto, {
      name: '<script>alert(1)</script>Trip',
      currency: GroupCurrency.XLM,
    });
    expect(dto.name).not.toContain('<script>');
    expect(dto.name).not.toContain('</script>');
    // Tags stripped; remaining text is harmless plain text
    expect(dto.name).toContain('Trip');
  });

  it('strips HTML attributes (onclick, etc.) from name', async () => {
    const dto = await transform(CreateGroupDto, {
      name: '<a onclick="steal()">Click me</a>',
      currency: GroupCurrency.XLM,
    });
    expect(dto.name).not.toContain('<a');
    expect(dto.name).toContain('Click me');
  });

  it('strips img src injection from name', async () => {
    const dto = await transform(CreateGroupDto, {
      name: 'Trip<img src=x onerror=alert(1)>',
      currency: GroupCurrency.XLM,
    });
    expect(dto.name).toBe('Trip');
    expect(dto.name).not.toContain('<img');
  });

  it('preserves normal text without HTML tags', async () => {
    const dto = await transform(CreateGroupDto, {
      name: 'Berlin Weekend',
      currency: GroupCurrency.XLM,
    });
    expect(dto.name).toBe('Berlin Weekend');
  });

  it('passes validation for a clean name', async () => {
    const errs = await errors(CreateGroupDto, { name: 'Road Trip', currency: GroupCurrency.XLM });
    expect(errs).toHaveLength(0);
  });

  it('fails validation when name is too short after stripping tags', async () => {
    // Name becomes empty string after stripping → fails @MinLength(2)
    const errs = await errors(CreateGroupDto, { name: '<b></b>', currency: GroupCurrency.XLM });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('fails validation when name exceeds 80 chars', async () => {
    const errs = await errors(CreateGroupDto, {
      name: 'A'.repeat(81),
      currency: GroupCurrency.XLM,
    });
    expect(errs.length).toBeGreaterThan(0);
  });
});

// ─── UpdateGroupDto — @Transform XSS stripping ───────────────────────────────

describe('UpdateGroupDto — @Transform sanitization', () => {
  it('strips HTML from optional name field', async () => {
    const dto = await transform(UpdateGroupDto, { name: '<h1>Hacked</h1>' });
    expect(dto.name).toBe('Hacked');
    expect(dto.name).not.toContain('<h1>');
  });

  it('allows undefined name (optional field)', async () => {
    const errs = await errors(UpdateGroupDto, {});
    expect(errs).toHaveLength(0);
  });
});
