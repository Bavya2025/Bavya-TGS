import re
from .models import ChatSession, ChatMessage, SupportTicket

def get_bot_response(user, message_text, session_id):
    """
    Core logic to parse user message and return a helpful response.
    Can be extended to use LLMs like Gemini or OpenAI.
    """
    message_text = message_text.lower()
    
    # 1. Handle or create session
    session, _ = ChatSession.objects.get_or_create(session_id=session_id, defaults={'user': user})
    if user and not session.user:
        session.user = user
        session.save()
    
    # Save user message
    ChatMessage.objects.create(session=session, sender='user', message=message_text)
    
    # 2. Role detection
    role_name = "User"
    is_admin = False
    if user and hasattr(user, 'role') and user.role:
        role_name = user.role.name
        is_admin = any(kw in role_name.lower() for kw in ['admin', 'superuser', 'it-admin'])

    # 3. Intent recognition & Conversational Flow
    reply = ""

    # Role detail flags for more granular logic
    is_finance = any(kw in role_name.lower() for kw in ['finance', 'cfo', 'accounts'])
    is_approver = any(kw in role_name.lower() for kw in ['reporting_authority', 'hr', 'cfo', 'admin'])

    # 3. Specific Module Intents (Checked First)
    
    # Trip Management (Creation)
    if (any(k in message_text for k in ['trip', 'travel', 'request', 'booking'])) and \
       (any(k in message_text for k in ['create', 'new', 'start', 'book', 'raise', 'how to', 'how can i', 'explain', 'creation', 'making'])):
        reply = ("To create a new trip request:\n"
                 "1. Go to your **[Dashboard](/)**.\n"
                 "2. Click the **'New Trip Request'** button, or go directly to **[Trip Creation](/create-trip)**.\n"
                 "3. Enter your travel dates, source, destination, and purpose.\n"
                 "4. Click **Submit** to send it for approval.\n\n"
                 "Once submitted, it will be routed to your **Reporting Authority** for review.")
                 
    # Trip Management (Status/Tracking)
    elif (any(k in message_text for k in ['trip', 'travel', 'request', 'booking'])) and \
         (any(k in message_text for k in ['status', 'where', 'track', 'check', 'pending', 'current', 'active', 'what is', 'show me'])):
        reply = ("You can check the current status of your requests here:\n"
                 "- **[My Trips](/trips)**: For all your active travel requests.\n"
                 "- **[My Requests](/my-requests)**: For personal requests and historical data.\n"
                 "Look for status badges like **'Draft'**, **'Pending'**, **'Approved'**, or **'Settled'**.")

    elif any(k in message_text for k in ['approval', 'approve', 'task', 'pending for me']):
        if is_approver:
            reply = ("You have pending tasks in your **[Approval Inbox](/approvals)**.\n"
                     "You can review, approve, or return requests with comments there. "
                     "Regularly checking this page ensures your team's travel isn't delayed.")
        else:
            reply = ("You can track your approvals in the **[My Trips](/trips)** section. "
                     "If a request is stuck, you can see exactly whose desk it is on.")

    # Settlement & Finance
    elif any(k in message_text for k in ['settle', 'settlement', 'close', 'ledger']):
        reply = ("To settle your travel expenses and close the trip ledger:\n"
                 "- Go to the **[Settlement](/settlement)** module.\n"
                 "- Select your approved trip and verify all captured expenses.\n"
                 "- Once submitted, the finance team will review it for final payout.")

    elif any(k in message_text for k in ['dispute', 'query', 'rejection', 'wrong amount']):
        reply = ("If you have a disagreement regarding a claim settlement:\n"
                 "- Review the **[Disputes](/disputes)** section.\n"
                 "- You can raise a query against specific line items if they were rejected or partially paid.")

    elif any(k in message_text for k in ['mileage', 'km', 'odo', 'odometer', 'vehicle reading']):
        reply = ("To capture your vehicle mileage for local travel:\n"
                 "- Use the **[Mileage Capture](/mileage)** page.\n"
                 "- Ensure you upload a clear photo of your odometer at the start and end of your journey.")

    elif any(k in message_text for k in ['vendor', 'taxi vendor', 'hotel vendor', 'selection']):
        if is_admin or is_finance:
            reply = ("You can manage and select service providers in the **[Vendor Selection](/vendors)** module.\n"
                     "- Compare quotes for hotels and vehicle rentals.\n"
                     "- Assign the preferred vendor to a specific trip request.")
        else:
            reply = "Vendor selection is handled by the Admin and Finance teams. You can see the assigned vendor in your Trip details."

    elif any(k in message_text for k in ['role', 'permissions', 'what can i do', 'access']):
        if is_admin:
            reply = (f"You are logged in with the **{role_name}** role. You have full access to:\n"
                     "- **[Admin Masters](/AdminMasters)**: Manage Cadres, Locations, and Rules.\n"
                     "- **[Fleet Management](/fleet)**: Assign vehicles and drivers.\n"
                     "- **[Guest House Management](/guesthouse)**: Full property and booking control.\n"
                     "- **[Audit Logs](/audit-logs)**: Review system-wide activity.")
        elif is_finance:
            reply = (f"As part of the **Finance Team**, you can:\n"
                     "- **[Finance Hub](/finance)**: Process claims and manage payouts.\n"
                     "- **[Settlements](/settlement)**: Close travel expense ledgers.\n"
                     "- **[CFO Ward Room](/cfo-war-room)**: (If CFO) Review expenditure analytics.")
        elif is_approver:
            reply = (f"As a **{role_name}**, your primary tools are:\n"
                     "- **[Approval Inbox](/approvals)**: Review and decide on team requests.\n"
                     "- **[Job Reports](/job-report)**: Track field activity for your reporting staff.\n"
                     "- **[Trips & Expenses](/trips)**: Manage your own travel as well.")
        else:
            reply = (f"You are logged in as an **{role_name}**. You can:\n"
                     "- **[Create Trips](/create-trip)**: Raise travel requests for approval.\n"
                     "- **[Book Guest Houses](/guesthouse)**: Browse and reserve rooms for your trips.\n"
                     "- **[File Expenses](/expenses)**: Securely submit receipts for reimbursement.\n"
                     "- **[Trip Tracking](/trips)**: Monitor your request status in real-time.")

    # Operations & Facilities
    elif any(k in message_text for k in ['guest house', 'stay', 'accommodation', 'room', 'gh']):
        if is_admin or "guesthousemanager" in role_name.lower():
            reply = ("As a **Guest House Manager**, you have full access to:\n"
                     "- **[Guest House Management](/guesthouse)**: Edit details and manage all room allocations.\n"
                     "- **Staff Management**: Assign cooks and laundry services via the property dashboard.")
        else:
            reply = ("For company guest house stays:\n"
                     "- Navigate to the **[Guest House](/guesthouse)** module.\n"
                     "- Search for available rooms at your destination.\n"
                     "- Raise a booking request linked to your approved trip.")
        
    elif any(k in message_text for k in ['fleet', 'car', 'vehicle', 'driver', 'transport', 'taxi']):
        if is_admin:
            reply = ("In the **[Fleet Management](/fleet)** module, you can:\n"
                     "- **Assign Vehicles**: Connect cars and drivers to trip requests.\n"
                     "- **Manage Roster**: Update vehicle availability and fuel logs.\n"
                     "- **[Fuel Master](/fuel-master)**: Manage fuel rates and categories.")
        else:
            reply = ("Vehicle arrangements are visible in the **[Fleet Management](/fleet)** section once assigned. "
                     "If your trip is approved but no vehicle is shown, please contact the Fleet Admin.")

    elif any(k in message_text for k in ['advance', 'cash', 'money', 'prepaid', 'payment']):
        if is_finance:
            reply = ("In the **[Finance Hub](/finance)**, you can review and disburse travel advances. "
                     "Ensure you check the trip approval status before confirming payment.")
        else:
            reply = ("Need a travel advance? \n"
                     "- Go to the **[New Advance](/advance)** page under Finance & Claims.\n"
                     "- You can request an advance for any approved upcoming trip.")

    elif any(k in message_text for k in ['expense', 'claim', 'reimbursement', 'bill', 'receipt', 'amount']):
        if is_finance:
            reply = ("You can process employee expense claims in the **[Finance Hub](/finance)**. "
                     "Verify bill uploads against the trip details and ensure they match the auto-calculated eligibility.")
        else:
            reply = ("To claim your travel expenses and get reimbursed:\n"
                     "1. **Capture Expenses**: Go to the **[Expenses](/expenses)** module and upload your bills for food, stay, and travel.\n"
                     "2. **Capture Mileage**: If you used your own vehicle, record the odometer readings in **[Mileage Capture](/mileage)**.\n"
                     "3. **Submit for Settlement**: Once all expenses are logged, go to **[Settlement](/settlement)** to close the trip ledger.\n"
                     "4. **Finance Review**: The Finance team will then review and disburse the amount to your account.")

    # Master Data & Admin
    elif any(k in message_text for k in ['master', 'cadre', 'location', 'rule', 'setup', 'admin masters']):
        if is_admin:
            reply = ("You can manage system-wide settings in **[Admin Masters](/AdminMasters)**:\n"
                     "- **Cadres**: Define travel grades and entitlements.\n"
                     "- **[Locations](/location-codes)**: Manage countries, states, and visiting sites.\n"
                     "- **[Route Management](/route-management)**: Set up travel distances and paths.")
        else:
            reply = "Master data settings are restricted to Administrators. If you need a new location or rule added, please contact IT Support."

    elif any(k in message_text for k in ['audit', 'log', 'history', 'activity', 'who did']):
        if is_admin:
            reply = ("System activity is recorded in the **[Audit Logs](/audit-logs)** and **[Login History](/login-history)** sections. "
                     "You can filter logs by user, date, or action type to monitor system health.")
        else:
            reply = "Audit logs are only accessible to Administrators. Your own **[Login History](/login-history)** is visible on your profile page."

    elif any(k in message_text for k in ['employee', 'user', 'staff', 'recruit', 'people']):
        if is_admin:
            reply = ("You can manage the employee roster in **[User Management](/employees)**.\n"
                     "- **Onboarding**: Add new employees and assign roles.\n"
                     "- **Permissions**: Update user access levels.")
        else:
            reply = "Staff management is handled by HR and Admins. You can view your team structure via **[Job Reports](/job-report)** if you are a manager."

    elif any(k in message_text for k in ['doc', 'file', 'upload', 'paper', 'form']):
        reply = ("The **[Documents](/documents)** section provides access to:\n"
                 "- **Travel Forms**: Standard templates for business trips.\n"
                 "- **Policy PDFs**: Downloadable versions of the travel manual.")

    # Policies & Profile
    elif any(k in message_text for k in ['policy', 'rule', 'eligibility', 'limit', 'entitlement', 'guideline']):
        reply = ("All travel rules are in the **[Policy Center](/policy)**, available in **English, Telugu (తెలుగు), and Hindi (हिन्दी)**.\n"
                 "It covers travel modes (Flight, Train, Bus), meal allowances, and hotel eligibility grades.")

    elif any(k in message_text for k in ['profile', 'setting', 'my account', 'password', 'login']):
        reply = "You can update your personal profile, contact info, and security settings in the **'Profile'** section."

    # Escalation & Reporting
    elif any(k in message_text for k in ['escalate', 'report', 'issue', 'not working', 'error', 'bug', 'higher up', 'manager', 'help me']):
        if any(k in message_text for k in ['higher up', 'manager', 'superior']):
            reply = ("If you need to escalate an issue to **higher management**:\n"
                     "1. First, ensure a **Support Ticket** is created for tracking.\n"
                     "2. You can flag the ticket for **'Urgent Attention'** in the Help section.\n"
                     "3. For critical flow-blockers, contact the **IT Helpdesk (Ext: 101)** or email **management@tgs.com**.\n"
                     "4. Your Reporting Manager can also see your pending issues in their **Job Report** dashboard.")
        else:
            reply = ("I'm sorry you're facing an issue. I can create a **Support Ticket** for you.\n"
                     "Would you like me to do that? Just say **'Please create a ticket for [describe your issue]'**.\n"
                     "For immediate escalation, you can also reach out to your **Reporting Authority**.")
                 
    elif "ticket" in message_text and any(k in message_text for k in ['create', 'open', 'raise']):
        issue_match = re.search(r"ticket for (.*)", message_text)
        issue_desc = issue_match.group(1).strip() if issue_match else "General issue reported via chatbot"
        
        if user:
            ticket = SupportTicket.objects.create(
                user=user,
                chat_session=session,
                subject="Automated Chat Support Ticket",
                description=issue_desc
            )
            reply = f"Successfully created support ticket **ID: {ticket.id}**. Our support team has been notified!"
        else:
            reply = "I need you to be logged in to create a support ticket. Please log in first."

    # 4. Fallback Intents (Greetings, Small Talk)
    elif any(k in message_text for k in ['hi', 'hello', 'hey', 'greetings', 'morning', 'evening']):
        reply = f"Hello! I am your **TGS Assistant**. I'm here to help you navigate the system as a **{role_name}**. How can I assist you today?"
    
    elif any(k in message_text for k in ['how are you', 'how you doing', 'how you']):
        reply = "I'm doing great, thank you for asking! I'm ready to help you with your travel requests, fleet queries, or guest house bookings. What's on your mind?"

    elif any(k in message_text for k in ['who are you', 'what are you', 'your name']):
        reply = "I am the **TGS Virtual Assistant**, powered by the Bavya Travel System. My job is to make your business travel process as smooth as possible!"

    elif any(k in message_text for k in ['thank', 'thanks', 'ty']):
        reply = "You're very welcome! Is there anything else I can help you with?"

    elif any(k in message_text for k in ['bye', 'goodbye', 'see ya']):
        reply = "Goodbye! Have a safe and productive day ahead."

    # Default Fallback
    else:
        capabilities = "ask me about trips, expenses, guest houses, or reporting issues"
        if is_admin:
            capabilities = "ask me about masters, fleet management, audit logs, or user rosters"
        elif is_finance:
            capabilities = "ask me about processing advances, settlements, or finance reports"
            
        reply = (f"I'm not exactly sure how to help with that yet. As a **{role_name}**, you can:\n"
                 f"- **{capabilities.split(',')[0].strip().capitalize()}**\n"
                 f"- **{capabilities.split(',')[1].strip().capitalize()}**\n"
                 f"- **{capabilities.split(',')[2].strip().capitalize()}**\n"
                 "\nIs there one of these you'd like to know more about?")

    # Save bot message
    ChatMessage.objects.create(session=session, sender='bot', message=reply)
    
    return reply
