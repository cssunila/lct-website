import { Button } from "@base-ui/react/button"

const IconBtn = ({
    children,
    danger,
    ...props
}: Button.Props & {
    children: React.ReactNode;
    danger?: boolean;
}) => {
    return (
        <Button
            {...props}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${danger
                    ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                    : "border-border-strong text-muted-foreground hover:text-foreground"
                }`}
        >
            {children}
        </Button>
    );
}

export default IconBtn;