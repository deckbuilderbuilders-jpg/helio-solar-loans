<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- /welcome splash renders outside the app Shell (switched in __root by pathname); first visit to / redirects there once via localStorage "helio.welcomed". Why: splash must not restyle or wrap the app.
- src/lib/helio/ledger.ts is the single source of truth for note state transitions; pages only call store actions. Why: keeps the future Anchor program a 1:1 port.
