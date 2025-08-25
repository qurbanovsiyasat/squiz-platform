frontend:
  - task: "Admin & SuperAdmin list style + Switch color + Form attachments"
    implemented: true
    working: pending
    file: 
      - "/app/src/pages/SuperAdminPanel.tsx"
      - "/app/src/components/ui/Switch.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "dev"
        comment: "Converted SuperAdminPanel to card/list layout matching AdminPanel with Material 3 purple switches; improved mobile responsiveness."
      - working: "NA"
        agent: "dev"
        comment: "Kept AdminPanel as list. Global Switch updated to M3 purple (#6750A4). Investigated form attachments visibility; code already aggregates DB + settings attachments."

metadata:
  created_by: "e1"
  version: "1.1"
  test_sequence: 2

notes:
  - "User requested both Admin and Super Admin to be list-style; done."
  - "User wants purple (mor) color for switches; global Switch is now purple."
  - "For forms: attachments are saved into settings and optionally into DB via RPC. Detail page composes from both sources; if still invisible we need a specific form id to debug environment/bucket visibility."

Testing Protocol:
  - "Start app, open /admin and /admin/super on mobile and desktop; ensure list cards render with Make Admin/Remove Admin, purple toggle for Quiz Creation, and red Delete."
  - "Create a new form with an image and a PDF, save, then open /form/:id and verify attachments appear in 'Attachments' section."