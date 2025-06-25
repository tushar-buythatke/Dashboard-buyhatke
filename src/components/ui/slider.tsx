import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-200">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
    </SliderPrimitive.Track>
    {Array.isArray(props.value) ? (
      props.value.map((_, index) => (
        <SliderPrimitive.Thumb 
          key={index}
          className="block h-5 w-5 rounded-full border-2 border-white bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 cursor-grab active:cursor-grabbing" 
        />
      ))
    ) : (
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-white bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 cursor-grab active:cursor-grabbing" />
    )}
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
