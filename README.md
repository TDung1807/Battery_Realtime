# Battery Realtime

A small personal project to monitor battery status of multiple devices
(Ipads, Iphones) and view them on a web dashboard in real time.

## Features

-   Collects battery level and charging state from iOS Shortcuts.\
-   Sends data securely via Cloudflare Worker → Supabase.\
-   Realtime updates on a web UI (Cloudflare Pages).\
-   Simple authentication with Supabase Auth.

## Stack

-   **Frontend**: HTML, CSS, JS (Cloudflare Pages)\
-   **Backend**: Cloudflare Worker (TypeScript)\
-   **Database**: Supabase (Postgres + Realtime)\
-   **Automation**: iOS Shortcuts



## Notes

-   Auth restricted by allowed email list.\
-   State is normalized: `charging`, `full`, `not_charging`.
