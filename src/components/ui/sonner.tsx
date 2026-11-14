import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="bottom-center"
      offset="28px"
      expand={false}
      richColors={false}
      closeButton={false}
      duration={2600}
      visibleToasts={3}
      gap={10}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'e-toast',
          actionButton: 'btn-halo btn-halo-sm ml-auto',
          cancelButton: 'btn-halo-ghost btn-halo-sm',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
