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
      visibleToasts={2}
      gap={10}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'velvet-toast group/toast',
          title: 'velvet-toast-title',
          description: 'velvet-toast-desc',
          icon: 'velvet-toast-icon',
          actionButton: 'velvet-toast-action',
          cancelButton: 'velvet-toast-cancel',
          success: 'velvet-toast--success',
          error: 'velvet-toast--error',
          info: 'velvet-toast--info',
          warning: 'velvet-toast--warning',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
