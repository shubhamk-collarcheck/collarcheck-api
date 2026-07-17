# SQS Email Queue Flow Diagram

> **Stack:** Node.js API + SQS · worker under `src/worker/`  
> **Related:** [sendCompanyInvite.md](./sendCompanyInvite.md) · `utils/sqs.ts`

## Overview

This diagram shows how the `sendCompanyInvite` endpoint uses AWS SQS to send email notifications asynchronously.

---

## Flow Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant E as Employee
    participant API as Node.js API
    participant DB as MySQL Database
    participant SQS as AWS SQS Queue
    participant Worker as SQS Worker (Node src/worker)
    participant Email as Email Service

    E->>API: POST /wapi/employee/sendCompanyInvite
    Note over E,API: { company, email, contact_person }

    API->>API: Validate request (Zod schema)
    API->>DB: Check existing invite (added_by + company)
    DB-->>API: Return existing invite or null

    alt Invite exists
        API->>DB: UPDATE company_invite SET ...
    else New invite
        API->>DB: INSERT INTO company_invite
        DB-->>API: Return invite ID
    end

    API->>API: Generate encrypted invite URL
    Note over API: invite_url = REACT_SITE/signup?invite=<base64(id)>

    API->>SQS: Send message (async, non-blocking)
    Note over SQS: { type: "SEND_EMAIL",<br/>payload: { mail: { email, template: 50, vars } } }

    API-->>E: { status: true, messages: "Company invite send!" }

    Note over SQS: Message in queue...

    SQS->>Worker: Receive message (long polling)
    Worker->>Worker: Parse message body
    Worker->>Worker: Extract email data

    alt Email template exists
        Worker->>Email: Send email via SMTP/API
        Email-->>Worker: Success
        Worker->>SQS: Delete message from queue
    else Email failed
        Worker->>SQS: Message stays in queue (retry)
    end

    Worker->>DB: INSERT INTO trigger_email (optional logging)
```
---

## Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        E[Employee Browser/Mobile]
    end

    subgraph "API Layer"
        API[Node.js Express API]
        Validation[Zod Validation]
        Auth[JWT Authentication]
    end

    subgraph "Business Logic"
        Service[Company Invite Service]
        Repository[Company Invite Repository]
    end

    subgraph "Data Layer"
        DB[(MySQL Database)]
        S3[AWS S3 - File Storage]
    end

    subgraph "Message Queue"
        SQS[AWS SQS Queue]
        FIFO[FIFO Queue Type]
    end

    subgraph "Worker Layer"
        Worker[PHP SQS Worker]
        EmailService[Email Service]
    end

    subgraph "External Services"
        SMTP[SMTP Server]
        Firebase[Firebase - Push Notifications]
    end

    E -->|HTTP Request| API
    API --> Auth
    Auth --> Validation
    Validation --> Service
    Service --> Repository
    Repository --> DB
    Service -->|Async| SQS
    SQS --> Worker
    Worker --> EmailService
    EmailService --> SMTP
    Worker -->|Push| Firebase
    Service -.->|File uploads| S3
```
---

## SQS Message Format

```mermaid
graph LR
    subgraph "Message Structure"
        M[Message]
        T[type]
        P[payload]
        
        subgraph "Payload"
            Mail[mail]
            Trigger[trigger]
        end
        
        subgraph "Mail Object"
            Email[email]
            Template[template]
            Vars[vars]
        end
        
        subgraph "Vars Object"
            URL[invite_url]
            Name[employee_name]
        end
    end

    M --> T
    M --> P
    P --> Mail
    P --> Trigger
    Mail --> Email
    Mail --> Template
    Mail --> Vars
    Vars --> URL
    Vars --> Name
```
---

## SQS Worker Processing Flow

```mermaid
flowchart TD
    Start([Worker Start]) --> Receive[Receive Message from SQS]
    Receive --> Check{Message exists?}
    
    Check -->|No| Sleep[Sleep 5 seconds]
    Sleep --> Receive
    
    Check -->|Yes| Parse[Parse JSON Body]
    Parse --> Type{Message Type}
    
    Type -->|SEND_EMAIL| Email[Handle Email]
    Type -->|SEND_PUSH| Push[Handle Push]
    Type -->|SEND_WHATSAPP| WhatsApp[Handle WhatsApp]
    Type -->|SEND_SCHEDULAR| Schedular[Handle Schedular]
    Type -->|Unknown| Log[Log Unknown Type]
    
    Email --> Validate{Email data valid?}
    Validate -->|No| Skip1[Skip - Log Warning]
    Validate -->|Yes| Send[Send Email via SMTP]
    
    Send --> Success{Email sent?}
    Success -->|Yes| Delete[Delete Message from SQS]
    Success -->|No| Retry[Message stays in queue]
    
    Delete --> LogTrigger[Log to trigger_email table]
    LogTrigger --> Continue[Continue to next message]
    
    Push --> GetTokens[Get Device Tokens from DB]
    GetTokens --> SendPush[Send Push via Firebase]
    SendPush --> DeletePush[Delete Message]
    
    Skip1 --> Continue
    Retry --> Continue
    Log --> Continue
    WhatsApp --> Continue
    Schedular --> Continue
    
    Continue --> Receive
```
---

## Environment Variables

```mermaid
graph LR
    subgraph "Required Environment Variables"
        AWS_KEY[AWS_KEY]
        AWS_SECRET[AWS_SECRET]
        AWS_REGION[AWS_REGION]
        AWS_SQS_URL[AWS_SQS_URL]
        REACT_SITE[REACT_SITE]
    end

    subgraph "Used By"
        API[Node.js API]
        Worker[PHP Worker]
    end

    AWS_KEY --> API
    AWS_KEY --> Worker
    AWS_SECRET --> API
    AWS_SECRET --> Worker
    AWS_REGION --> API
    AWS_REGION --> Worker
    AWS_SQS_URL --> API
    REACT_SITE --> API
```
---

## Key Points

1. **Asynchronous Processing**: Email is sent via SQS, not synchronously in the API request
2. **Non-blocking**: API returns success immediately after queuing the message
3. **Retry**: If email fails, message stays in queue for retry
4. **Long Polling**: Worker uses 20-second long polling to reduce empty reads
5. **FIFO Queue**: Ensures message ordering and deduplication
6. **Error Handling**: Failed messages are not deleted, allowing SQS to retry

---

## Diagram Files

Save this file as: `src/api-ai-document/sqs-flow-diagram.md`

This diagram can be rendered in:
- GitHub/GitLab markdown
- VS Code with Mermaid extension
- Any Mermaid-compatible viewer
