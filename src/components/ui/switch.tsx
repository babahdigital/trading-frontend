'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
      'border border-transparent transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted',
      'data-[state=checked]:border-primary/40 data-[state=unchecked]:border-border',
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full',
        'bg-background shadow-md ring-0 transition-transform',
        'data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5',
        'data-[state=checked]:bg-primary-foreground',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

interface LabeledSwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  label: string;
  description?: string;
  id?: string;
}

const LabeledSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  LabeledSwitchProps
>(({ label, description, id, className, ...props }, ref) => {
  const generatedId = React.useId();
  const switchId = id || generatedId;
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2', className)}>
      <div className="flex-1 min-w-0">
        <label
          htmlFor={switchId}
          className="text-sm font-medium text-foreground cursor-pointer select-none"
        >
          {label}
        </label>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        ) : null}
      </div>
      <Switch ref={ref} id={switchId} {...props} />
    </div>
  );
});
LabeledSwitch.displayName = 'LabeledSwitch';

export { Switch, LabeledSwitch };
