# Ecom Navigation — Platform Roadmap & Architecture

---

## 1. Current Working System

- Amazon OAuth (end-to-end, live)
- AWS Secrets Manager credential storage
- FastAPI backend on AWS App Runner (`api/`)
- Next.js frontend (`apps/web/`)
- AWS Cognito auth (JWT, NextAuth)
- Dashboard with KPI cards, marketplace connections, supplier pipeline, alerts, and revenue trend
- Public homepage positioned as a multichannel ecommerce operations platform

---

## 2. Product Vision

Ecom Navigation is a multichannel ecommerce command center for sellers who operate across Amazon, Shopify, Walmart, eBay, TikTok, Instagram, and other channels.

The platform connects marketplaces, pulls balances, payouts, orders, listings, and inventory, imports distributor price sheets, maps SKUs/UPCs/vendor item numbers, reprices products, and automates operational workflows.

Email integration (Outlook/Microsoft Graph), customer accounts, multi-tenant workspaces, and an AI operations assistant round out the long-term vision.

---

## 3. Recommended Build Phases

### Phase 1 — Stabilize Amazon + Dashboard *(Current)*

- Amazon OAuth confirmed working end-to-end
- Dashboard data model and UI stable
- Deploy pipeline stable (AWS App Runner)
- Guardrails and secrets hygiene confirmed

---

### Phase 2 — Shopify Connector

- Shopify OAuth app flow (Next.js + FastAPI)
- Store orders, listings, and inventory sync
- Dashboard card: Connected / Not Connected
- Status endpoint + connect/disconnect flow

---

### Phase 3 — Customer Accounts and Tenant Setup

- Multi-tenant workspace model
- Cognito user → Workspace → MarketplaceConnections
- Tenant isolation in DB (RDS Postgres)
- Workspace settings UI

---

### Phase 4 — Distributor Feed Import and Mapping

- Upload or schedule supplier CSV/EDI feeds
- Map vendor item numbers → UPCs → ASINs
- SupplierFeed and SupplierCost data model
- Supplier pipeline dashboard panel

---

### Phase 5 — Orders and Balances Dashboard

- Pull Amazon orders and payouts
- Pull Shopify orders (Phase 2 prerequisite)
- Unified orders view across channels
- Balance and payout history panel

---

### Phase 6 — Outlook / Email Integration

- Microsoft Graph OAuth
- Connect seller email inbox
- Surface order confirmations, supplier emails, and alerts
- Workflow triggers from email events

---

### Phase 7 — Repricing Engine

- Rule-based repricing (floor, ceiling, buy box target)
- Per-ASIN and per-channel pricing rules
- PricingRule data model
- Repricing job history and audit log

---

### Phase 8 — Walmart and eBay Connectors

- Walmart Seller API (key-based, no OAuth required for basic access)
- eBay OAuth 2.0
- Listings, orders, and inventory sync for each
- Dashboard cards for both

---

### Phase 9 — TikTok Shop and Instagram / Meta Commerce *(Roadmap)*

- TikTok Shop Partner Program integration
- Meta Commerce API (requires Meta app review)
- External approval gates apply — build timeline dependent on approvals
- Homepage and dashboard show as "Roadmap" until approvals confirmed

---

### Phase 10 — AI Workflow Automation Assistant *(Roadmap)*

- Surfaces highest-priority actions across all connected channels
- Repricing, restocking, listing, and supplier suggestions
- Event-driven WorkflowEvent and Task model
- Natural language query layer (future)

---

## 4. Data Model Concepts

### Tenant / Workspace
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | string | Workspace display name |
| owner_user_id | string | Cognito sub |
| plan | string | free / pro / enterprise |
| created_at | timestamp | |

### MarketplaceConnection
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| workspace_id | uuid | FK → Workspace |
| channel | enum | amazon \| shopify \| walmart \| ebay \| tiktok \| instagram |
| status | enum | connected \| disconnected \| coming_soon |
| connected_at | timestamp | |
| credentials_ref | string | Secrets Manager key reference — never store raw credentials |

### MarketplaceAccount
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| connection_id | uuid | FK → MarketplaceConnection |
| account_name | string | |
| account_id | string | Seller/merchant ID from channel |
| region | string | |
| last_synced_at | timestamp | |

### Product
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| workspace_id | uuid | |
| title | string | |
| brand | string | |
| upc | string | |
| asin | string | Amazon ASIN |
| sku | string | Internal SKU |
| vendor_item_number | string | Distributor item number |
| cost | decimal | Latest known cost |
| msrp | decimal | |
| created_at | timestamp | |

### Listing
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| product_id | uuid | FK → Product |
| channel | enum | |
| channel_listing_id | string | |
| status | enum | active \| inactive \| suppressed |
| price | decimal | |
| quantity | integer | |
| buy_box_status | enum | winning \| losing \| not_eligible |
| last_synced_at | timestamp | |

### Supplier
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| workspace_id | uuid | |
| name | string | |
| contact_email | string | |
| terms | string | Net 30, etc. |
| active | boolean | |

### SupplierFeed
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| supplier_id | uuid | |
| feed_type | enum | csv \| edi \| api |
| imported_at | timestamp | |
| row_count | integer | |
| status | enum | pending \| processed \| error |

### SupplierCost
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| feed_id | uuid | |
| product_id | uuid | Resolved FK → Product (nullable until mapped) |
| vendor_item_number | string | |
| upc | string | |
| cost | decimal | |
| map_price | decimal | Minimum advertised price |
| available_qty | integer | |
| effective_date | date | |

### Order
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| workspace_id | uuid | |
| channel | enum | |
| channel_order_id | string | |
| status | enum | pending \| fulfilled \| cancelled \| returned |
| total | decimal | |
| currency | string | |
| ordered_at | timestamp | |
| fulfilled_at | timestamp | |

### Payout
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| workspace_id | uuid | |
| channel | enum | |
| amount | decimal | |
| currency | string | |
| period_start | date | |
| period_end | date | |
| settled_at | timestamp | |

### PricingRule
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| workspace_id | uuid | |
| channel | enum | |
| rule_type | enum | floor \| ceiling \| buy_box_target |
| value | decimal | |
| product_scope | string | all, specific ASIN, category |
| active | boolean | |

### WorkflowEvent
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| workspace_id | uuid | |
| event_type | string | order.fulfilled, listing.suppressed, feed.imported, etc. |
| source_channel | enum | |
| payload | jsonb | |
| triggered_at | timestamp | |

### Task / Alert
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| workspace_id | uuid | |
| severity | enum | danger \| caution \| task \| info |
| text | string | |
| resolved | boolean | |
| created_at | timestamp | |

---

## 5. Integration Status and Notes

| Channel | Status | Notes |
|---|---|---|
| Amazon | **Live** | OAuth end-to-end working, credentials in Secrets Manager |
| Shopify | Planned | Next connector to build — OAuth app flow |
| Walmart | Planned | Key-based Seller API, no OAuth required for basic access |
| eBay | Planned | OAuth 2.0 required |
| TikTok Shop | Roadmap | Requires TikTok Shop Partner Program approval |
| Instagram / Meta | Roadmap | Requires Meta Commerce app review |
| Outlook / Microsoft Graph | Planned | Microsoft Graph OAuth |

---

## 6. Guardrails

- **Do not claim unsupported integrations are live** on any public-facing page until OAuth and sync are confirmed working end-to-end
- **All OAuth credentials must be stored in AWS Secrets Manager** — never in environment variables, logs, or client-side code
- **No secrets in logs** — mask all tokens, keys, and credential references in CloudWatch output
- **Tenant isolation required** — no cross-workspace data access at any layer (API, DB, cache)
- **Build one connector at a time** — stabilize and test each connector fully before starting the next
- **Every connector must implement:**
  - `GET /connections/{channel}/status` — returns connected / disconnected / coming_soon
  - Connect flow — OAuth callback or API key entry
  - Disconnect flow — revoke token + delete Secrets Manager ref
  - Dashboard card — visual status in the Marketplace Connections panel
- **Public homepage language standards:**
  - Use: *"built to connect," "planned," "rolling out," "roadmap"*
  - Never use: *"connected," "live," "available"* for a channel until it is fully working

---

## 7. Repo and Infrastructure Reference

| Layer | Location | Notes |
|---|---|---|
| Frontend | `apps/web/` | Next.js, App Router, NextAuth |
| API | `api/` | FastAPI, AWS App Runner |
| Services | `services/opportunity-scanner` | Background scan service |
| Auth | AWS Cognito | JWT, NextAuth Cognito provider |
| Secrets | AWS Secrets Manager | All OAuth tokens and API keys |
| Database | RDS Postgres | Target — tenant-isolated schema |
| Staging | `develop` branch | Deploys to dev environment |
| Production | `main` branch | Deploys to production |

---

*Last updated: 2026-05-27*
