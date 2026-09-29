import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/**
 * Underline tabs (Radix: arrow keys, Home/End and ARIA come for free).
 * items: [{ value, label, content }]. Controlled via value/onValueChange, or uncontrolled via defaultValue.
 */
export function Tabs({ items, defaultValue, value, onValueChange, label, className }) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? items[0]?.value} value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List aria-label={label} className="flex gap-1 overflow-x-auto border-b border-white/10 [scrollbar-width:none]">
        {items.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              '-mb-px shrink-0 border-b-2 border-transparent px-3 py-2.5 text-small font-semibold text-ink-2 transition-colors',
              'hover:text-ink-1 data-[state=active]:border-action data-[state=active]:text-ink-1',
            )}
          >
            {t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((t) => (
        <TabsPrimitive.Content key={t.value} value={t.value} className="pt-5">
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
