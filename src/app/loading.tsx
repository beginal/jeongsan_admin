export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary shadow-glass"></div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
            </div>
        </div>
    );
}
