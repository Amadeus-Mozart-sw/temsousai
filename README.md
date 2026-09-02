# 天爽祭 投票アプリ (temsousai)

このリポジトリには Next.js 15 (App Router) + TypeScript + Tailwind CSS を用いた投票入力アプリの骨格が入っています。

主なファイル:
- supabase/schema.sql : Supabase に流し込む DB スキーマとトリガー
- app/: Next.js App Router のページと管理画面の雛形
- components/: UI コンポーネント
- lib/supabaseClient.ts : Supabase クライアント

環境変数 (追加)
- NEXT_PUBLIC_SUPABASE_URL - Supabase プロジェクト URL (public)
- NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key (public)
- SUPABASE_SERVICE_ROLE_KEY - Supabase service_role key (server-only, required for secure server-side exports)
- EXPORT_ADMIN_SECRET - 管理用エクスポートAPIのシークレットヘッダ値 (server-only)

セットアップ手順は README を参照してください。

注意: CSV エクスポート API はサーバー側で SUPABASE_SERVICE_ROLE_KEY を使用し、管理用シークレット (EXPORT_ADMIN_SECRET) を検証してからデータを返します。運用時はこのシークレットを Vercel の環境変数に設定し、公開キーを使わないようにしてください。
