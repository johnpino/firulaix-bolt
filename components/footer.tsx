export function Footer() {
  return (
    <footer className="bg-white border-t border-border">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Firulaix. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}