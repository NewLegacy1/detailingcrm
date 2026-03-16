# Multi-Location Manager / Employee Testing

## Manager role view (location-scoped)

When a user has **Manager** (or Technician) role and is **assigned to a location** (`profiles.location_id` set), they only see data for that location:

- **Dashboard** – jobs, counts, recent jobs, and calendar for their location only
- **Jobs** – list, day, and month views filtered by their location
- **Schedule** – only jobs at their location; no location switcher
- **Invoices** – only invoices whose job is at their location
- **Customers** – only customers who have jobs at their location
- **Reports / Analytics** – only jobs (and related payments) at their location
- **Sidebar** – job and invoice counts are location-scoped; **Settings** is hidden for location managers

Employees (technicians) with a location assignment are scoped the same way.

## Testing as Manager assigned to Mississauga

Do everything in the CRM; no SQL or migrations needed for testing.

1. **Enable multi-location** (if not already):  
   **Settings → Locations** → turn on “Multi-location booking”.

2. **Create or confirm “Mississauga”**:  
   **Settings → Locations** → add a location named **Mississauga** (or use an existing one).

3. **Assign yourself as Manager for Mississauga**:  
   - Go to **Settings → Team**.
   - Find your user and click **Edit** (pencil).
   - Set **Role** to **Manager**.
   - Set **Location** to **Mississauga**.
   - Save.

4. **Test the manager view**:  
   Sign out and sign back in (or refresh). You should now see only Mississauga’s jobs, invoices, and analytics. The **Settings** item is hidden in the sidebar.

**To switch back to Owner (full access):**  
Use another owner account to edit your user in **Settings → Team** and set your role back to **Owner** and clear **Location**.

## Multi-location rules for employees

- When **multi-location is enabled**, **managers and technicians must be assigned to a location** (enforced on invite and when editing a team member).
- New invites for manager/technician require a location when multi-location is on.
- Existing members: when you change their role to manager or technician and multi-location is on, you must pick a location in the edit dialog.
