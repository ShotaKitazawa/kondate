# kondate

献立メモ PWA。日々の昼食・夕食の献立と買い物リストを管理する。

## 構成

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React + TypeScript + Vite (PWA) |
| バックエンド | Go、SQLite |
| 認証 | OIDC (JWT Bearer) |
| デプロイ | Kubernetes、単一コンテナ（フロントエンドを埋め込み） |

## ローカル開発

### 前提

[mise](https://mise.jdx.dev/) をインストール済みであること。

```sh
mise install
```

### 起動

```sh
# バックエンド + フロントエンドを同時起動（ホットリロード付き）
mise run dev
```

- バックエンド: http://localhost:8080 (`--disable-oidc` フラグで認証スキップ)
- フロントエンド: http://localhost:5173

### Docker Compose で起動する場合

```sh
# .env を作成して OIDC 設定を記載
cat > .env <<'EOF'
OIDC_ISSUER=https://example.auth0.com/
OIDC_AUDIENCE=https://api.example.com
OIDC_CLIENT_ID=your-client-id
EOF
docker compose up
```

## 主なタスク

```sh
mise run generate   # コード生成（API・DB）
mise run format     # フォーマット
mise run ci         # ビルド・lint・テスト（全部）
mise run pre-merge  # マージ前チェック（generate → format → ci）
```

## 環境変数（バックエンド）

| 変数 | 説明 |
|------|------|
| `DB_PATH` | SQLite ファイルパス（例: `/data/app.db`） |
| `OIDC_ISSUER` | OIDC issuer URL |
| `OIDC_AUDIENCE` | OIDC audience |
| `OIDC_CLIENT_ID` | OIDC client ID（フロントエンドへ `/api/oidc-config` 経由で公開される） |

## デプロイ

```sh
# コンテナイメージのビルド
docker build -t ghcr.io/ShotaKitazawa/kondate:latest .

# Kubernetes へ適用
kubectl apply -k manifests/
```
