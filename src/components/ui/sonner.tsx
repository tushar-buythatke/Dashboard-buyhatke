import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="bottom-right"
      offset="16px"
      expand={false}
      richColors={false}
      closeButton={false}
      duration={2500}
      visibleToasts={1}
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group/toast halo-card flex items-center gap-3 rounded-[999px] pl-4 pr-4 py-3 pointer-events-auto border-l-4 border-l-[var(--h-iris-500)] text-[0.8125rem] text-[var(--h-ink)]',
          title: 'font-semibold text-[var(--h-ink)]',
          description: 'halo-subtitle',
          icon: 'text-[var(--h-iris-600)]',
          actionButton: 'btn-halo-sm btn-halo',
          cancelButton: 'btn-halo-sm btn-halo-ghost',
          success: 'border-l-[var(--h-mint)]',
          error: 'border-l-[var(--h-coral)]',
          info: 'border-l-[var(--h-cyan)]',
          warning: 'border-l-[var(--h-amber)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
