from datetime import datetime, timedelta
import io
import csv
from flask_mail import Message
from app.extensions import celery, db
from app.models import Student, PlacementDrive, Application, User


# ==================================================================
# a. SCHEDULED JOB — Daily reminders
#    Runs every day at 8:00 AM
#    Sends email to students about drives closing within 3 days
# ==================================================================

@celery.task(name="jobs.send_daily_reminders")
def send_daily_reminders():
    from app.extensions import mail
    from flask import current_app

    now      = datetime.utcnow()
    in_3days = now + timedelta(days=3)

    # Drives closing in the next 3 days
    upcoming = PlacementDrive.query.filter(
        PlacementDrive.status == "approved",
        PlacementDrive.application_deadline >= now,
        PlacementDrive.application_deadline <= in_3days,
    ).all()

    if not upcoming:
        return {"status": "ok", "message": "No upcoming deadlines, no reminders sent"}

    students = Student.query.join(User).filter(User.is_active == True).all()
    sent = 0

    for student in students:
        # Only drives the student is eligible for and hasn't applied to yet
        applied_ids = {a.drive_id for a in student.applications}
        eligible_upcoming = [
            d for d in upcoming
            if d.id not in applied_ids
            and d.check_student_eligibility(student)[0]
        ]

        if not eligible_upcoming:
            continue

        html = _render_reminder_email(student, eligible_upcoming)

        try:
            msg = Message(
                subject="Placement Portal — Application deadlines closing soon!",
                recipients=[student.user.email],
                html=html,
            )
            mail.send(msg)
            sent += 1
        except Exception as e:
            print(f"[reminder] Failed to send to {student.user.email}: {e}")

    return {"status": "ok", "reminders_sent": sent}


# ==================================================================
# b. SCHEDULED JOB — Monthly activity report
#    Runs on the 1st of every month
#    Sends HTML report to admin via email
# ==================================================================

@celery.task(name="jobs.send_monthly_report")
def send_monthly_report():
    from app.extensions import mail
    from flask import current_app

    now       = datetime.utcnow()
    month_ago = now - timedelta(days=30)

    # Stats for the past month
    total_drives = PlacementDrive.query.filter(
        PlacementDrive.created_at >= month_ago
    ).count()

    total_applications = Application.query.filter(
        Application.applied_at >= month_ago
    ).count()

    total_selected = Application.query.filter(
        Application.applied_at >= month_ago,
        Application.status == "selected"
    ).count()

    new_students = Student.query.filter(
        Student.created_at >= month_ago
    ).count()

    drives_by_status = {
        s: PlacementDrive.query.filter_by(status=s).count()
        for s in ("pending", "approved", "rejected", "closed")
    }

    apps_by_status = {
        s: Application.query.filter_by(status=s).count()
        for s in ("applied", "shortlisted", "selected", "rejected")
    }

    html = _render_monthly_report(
        month=now.strftime("%B %Y"),
        total_drives=total_drives,
        total_applications=total_applications,
        total_selected=total_selected,
        new_students=new_students,
        drives_by_status=drives_by_status,
        apps_by_status=apps_by_status,
    )

    try:
        from flask import current_app
        admin_email = current_app.config.get("ADMIN_EMAIL", "hrimansaha.10@gmail.com")
        msg = Message(
            subject=f"Placement Portal — Monthly Report ({now.strftime('%B %Y')})",
            recipients=[admin_email],
            html=html,
        )
        mail.send(msg)
        return {"status": "ok", "message": f"Monthly report sent to {admin_email}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ==================================================================
# c. USER-TRIGGERED ASYNC JOB — Export applications as CSV
#    Called from student dashboard
#    Emails CSV to student when done
# ==================================================================

@celery.task(name="jobs.export_applications_csv")
def export_applications_csv(student_id):
    from app.extensions import mail

    student = Student.query.get(student_id)
    if not student:
        return {"status": "error", "message": "Student not found"}

    apps = Application.query.filter_by(student_id=student_id)\
                            .order_by(Application.applied_at.desc()).all()

    # Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID", "Student ID", "Student Name",
        "Company Name", "Drive Title", "Job Type",
        "Application Date", "Status", "Interview Type",
        "Interview Date", "Remarks"
    ])

    for a in apps:
        writer.writerow([
            a.id,
            student.id,
            student.full_name,
            a.company_name  if hasattr(a, 'company_name')  else (a.drive.company.name if a.drive else ""),
            a.drive_title   if hasattr(a, 'drive_title')   else (a.drive.title if a.drive else ""),
            a.drive.job_type if a.drive else "",
            a.applied_at.strftime("%Y-%m-%d %H:%M"),
            a.status,
            a.interview_type  or "",
            a.interview_date.strftime("%Y-%m-%d %H:%M") if a.interview_date else "",
            a.remarks or "",
        ])

    csv_content = output.getvalue()

    # Email CSV to student
    try:
        msg = Message(
            subject="Placement Portal — Your application history export",
            recipients=[student.user.email],
            html=_render_export_email(student, len(apps)),
        )
        msg.attach(
            filename=f"applications_{student.roll_number}.csv",
            content_type="text/csv",
            data=csv_content,
        )
        mail.send(msg)
        return {"status": "ok", "message": "CSV exported and emailed", "total": len(apps)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ==================================================================
# EMAIL TEMPLATES
# ==================================================================

def _render_reminder_email(student, drives):
    from flask import current_app

    frontend_url = current_app.config.get("FRONTEND_URL", "http://127.0.0.1:8080").rstrip("/")
    dashboard_url = f"{frontend_url}/#/student/dashboard"

    rows = ""
    for d in drives:
        deadline = d.application_deadline.strftime("%d %b %Y, %I:%M %p")
        rows += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">{d.title}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">{d.company.name if d.company else ''}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:500">{deadline}</td>
        </tr>"""

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
      <div style="background:#1a56db;padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px">Placement Portal</h1>
        <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px">Application deadline reminder</p>
      </div>
      <div style="padding:28px 32px">
        <p style="font-size:15px;color:#111827">Hi <strong>{student.full_name}</strong>,</p>
        <p style="font-size:14px;color:#374151">
          The following placement drives are closing soon. Don't miss out!
        </p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase">Drive</th>
              <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase">Company</th>
              <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase">Deadline</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <div style="text-align:center;margin:28px 0">
          <a href="{dashboard_url}"
            style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:8px;
                   text-decoration:none;font-weight:500;font-size:14px">
            Apply now
          </a>
        </div>
        <p style="font-size:13px;color:#9ca3af">
          You are receiving this because you are registered on the Placement Portal.
        </p>
      </div>
    </div>"""


def _render_monthly_report(month, total_drives, total_applications,
                            total_selected, new_students,
                            drives_by_status, apps_by_status):
    status_rows = ""
    for s, v in drives_by_status.items():
        status_rows += f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">{s}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">{v}</td>
        </tr>"""

    app_rows = ""
    for s, v in apps_by_status.items():
        app_rows += f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">{s}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">{v}</td>
        </tr>"""

    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff">
      <div style="background:#1a56db;padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px">Placement Portal</h1>
        <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px">Monthly activity report — {month}</p>
      </div>
      <div style="padding:28px 32px">
        <p style="font-size:15px;color:#111827">Hi Admin,</p>
        <p style="font-size:14px;color:#374151">Here is the placement activity summary for <strong>{month}</strong>.</p>

        <!-- Key numbers -->
        <div style="display:flex;gap:16px;margin:24px 0;flex-wrap:wrap">
          {"".join(f'''<div style="flex:1;min-width:120px;background:#f9fafb;border-radius:10px;
                         padding:16px;text-align:center;border:1px solid #e5e7eb">
            <div style="font-size:28px;font-weight:700;color:#1a56db">{v}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">{l}</div>
          </div>''' for v,l in [
              (total_drives,"New drives"),
              (total_applications,"Applications"),
              (total_selected,"Students selected"),
              (new_students,"New students"),
          ])}
        </div>

        <div style="display:flex;gap:24px;margin-top:24px;flex-wrap:wrap">
          <div style="flex:1;min-width:220px">
            <h3 style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px">Drives by status</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tbody>{status_rows}</tbody>
            </table>
          </div>
          <div style="flex:1;min-width:220px">
            <h3 style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px">Applications by status</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tbody>{app_rows}</tbody>
            </table>
          </div>
        </div>

        <p style="font-size:13px;color:#9ca3af;margin-top:28px">
          This report was auto-generated by the Placement Portal on {datetime.utcnow().strftime("%d %b %Y")}.
        </p>
      </div>
    </div>"""


def _render_export_email(student, count):
    return f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto">
      <div style="background:#1a56db;padding:24px 28px">
        <h1 style="color:#fff;margin:0;font-size:18px">Placement Portal</h1>
      </div>
      <div style="padding:28px">
        <p style="font-size:15px;color:#111827">Hi <strong>{student.full_name}</strong>,</p>
        <p style="font-size:14px;color:#374151">
          Your placement application history has been exported successfully.
          The CSV file with <strong>{count} application(s)</strong> is attached to this email.
        </p>
        <p style="font-size:13px;color:#9ca3af;margin-top:24px">
          Exported on {datetime.utcnow().strftime("%d %b %Y at %I:%M %p UTC")}
        </p>
      </div>
    </div>"""