import os
import random
from datetime import datetime, timedelta

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import User, Student, Company, PlacementDrive, Application, Notification


BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)


def seed_users_and_profiles():
    random.seed(42)

    target_students = int(os.getenv("SEED_STUDENT_COUNT", "1000"))
    target_companies = int(os.getenv("SEED_COMPANY_COUNT", "15"))

    admin_email = os.getenv("ADMIN_EMAIL", "admin@placement.com").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@1234")
    company_password = os.getenv("SEED_COMPANY_PASSWORD", "Company@123")
    student_password = os.getenv("SEED_STUDENT_PASSWORD", "Student@123")

    admin = User(
        email=admin_email,
        password_hash=generate_password_hash(admin_password),
        role="admin",
        is_active=True,
    )

    company_names = [
        "Amazon", "Microsoft", "Google", "Adobe", "Salesforce",
        "Infosys", "TCS", "Wipro", "Accenture", "Deloitte",
        "Flipkart", "Zomato", "Razorpay", "Zoho", "NVIDIA",
        "Intel", "Oracle", "Paytm", "Cognizant", "Siemens",
    ]
    industries = [
        "Technology", "Cloud", "FinTech", "Consulting", "E-commerce",
        "SaaS", "Semiconductors", "Analytics", "Enterprise Software",
    ]
    locations = [
        "Bangalore", "Hyderabad", "Chennai", "Pune", "Noida", "Gurgaon", "Mumbai", "Remote",
    ]

    first_names = [
        "Aarav", "Aditi", "Akhil", "Ananya", "Arjun", "Bhavya", "Darsh", "Deepika", "Dev", "Diya",
        "Eshan", "Gauri", "Harsh", "Ishita", "Jatin", "Kavya", "Kiran", "Laksh", "Meera", "Naman",
        "Neha", "Om", "Pooja", "Pranav", "Priya", "Rahul", "Riya", "Rohan", "Saanvi", "Sakshi",
        "Sanjay", "Shreya", "Sneha", "Tanvi", "Tarun", "Uday", "Vaibhav", "Vidhi", "Vivek", "Yash",
    ]
    last_names = [
        "Agarwal", "Bansal", "Chopra", "Das", "Ghosh", "Gupta", "Iyer", "Jain", "Kapoor", "Khan",
        "Kulkarni", "Menon", "Mishra", "Nair", "Pandey", "Patel", "Rao", "Reddy", "Sen", "Shah",
        "Sharma", "Singh", "Srinivasan", "Tiwari", "Varma", "Verma", "Yadav", "Pillai", "Joshi", "Malhotra",
    ]
    branches = ["CS", "IT", "ECE", "EE", "ME", "CE", "AI", "DS"]

    drive_titles = [
        "Software Engineer", "Backend Developer", "Frontend Developer", "Data Analyst", "Data Engineer",
        "ML Engineer", "QA Engineer", "DevOps Engineer", "Product Analyst", "Business Analyst",
        "Security Engineer", "Cloud Engineer", "Site Reliability Engineer", "Full Stack Engineer",
    ]
    job_types = ["full-time", "internship"]

    company_users = []
    companies = []

    selected_company_names = company_names[:target_companies]
    for i, company_name in enumerate(selected_company_names):
        slug = company_name.lower().replace(" ", "")
        email = f"hr{str(i + 1).zfill(2)}@{slug}.com"

        user = User(
            email=email,
            password_hash=generate_password_hash(company_password),
            role="company",
            is_active=True,
        )
        company_users.append(user)

    student_users = []
    students = []

    for i in range(target_students):
        student_idx = i + 1
        email = f"student{student_idx:04d}@test.com"
        user = User(
            email=email,
            password_hash=generate_password_hash(student_password),
            role="student",
            is_active=True,
        )
        student_users.append(user)

    db.session.add(admin)
    db.session.add_all(company_users)
    db.session.add_all(student_users)
    db.session.flush()

    for idx, (company_user, company_name) in enumerate(zip(company_users, selected_company_names), start=1):
        status = "approved"
        rejection_reason = None
        if idx in {target_companies - 1, target_companies}:
            status = "pending"
        if idx == target_companies - 2:
            status = "rejected"
            rejection_reason = "Incomplete compliance documents"

        hr_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        company_slug = company_name.lower().replace(" ", "")

        companies.append(
            Company(
                user_id=company_user.id,
                name=company_name,
                description=f"{company_name} runs campus hiring programs for engineering and product roles.",
                website=f"https://careers.{company_slug}.com",
                industry=random.choice(industries),
                location=random.choice(locations),
                hr_name=hr_name,
                hr_email=company_user.email,
                hr_phone=f"+91-9{idx:09d}",
                approval_status=status,
                rejection_reason=rejection_reason,
                is_blacklisted=False,
            )
        )

    for i, student_user in enumerate(student_users, start=1):
        branch = random.choice(branches)
        year = random.choices([2, 3, 4], weights=[0.15, 0.4, 0.45], k=1)[0]
        full_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        cgpa = round(random.uniform(6.0, 9.9), 2)
        dob_year = 2001 if year == 4 else (2002 if year == 3 else 2003)
        dob = datetime(dob_year, random.randint(1, 12), random.randint(1, 28)).date()

        students.append(
            Student(
                user_id=student_user.id,
                full_name=full_name,
                phone=f"+9198{i:08d}",
                dob=dob,
                branch=branch,
                year=year,
                cgpa=cgpa,
                resume_path=f"uploads/resumes/student_{i:04d}.pdf" if random.random() < 0.7 else None,
            )
        )

    db.session.add_all(companies)
    db.session.add_all(students)
    db.session.flush()

    now = datetime.utcnow()
    drives = []
    approved_companies = [c for c in companies if c.approval_status == "approved"]

    for company in companies:
        if company.approval_status == "approved":
            per_company_drives = random.randint(4, 7)
            status_pool = ["approved", "approved", "approved", "closed", "pending"]
        elif company.approval_status == "pending":
            per_company_drives = random.randint(1, 2)
            status_pool = ["pending"]
        else:
            per_company_drives = 1
            status_pool = ["rejected"]

        for _ in range(per_company_drives):
            status = random.choice(status_pool)
            job_type = random.choice(job_types)
            title = f"{random.choice(drive_titles)} {random.choice(['I', 'II', 'Intern', 'Associate'])}"
            eligible_branch_count = random.randint(3, 6)
            eligible_branch_list = random.sample(branches, k=eligible_branch_count)
            eligible_years_list = [3, 4] if job_type == "internship" else random.choice([[4], [3, 4]])
            min_cgpa = round(random.uniform(6.5, 8.5), 1)

            deadline_offset = random.randint(4, 28)
            drive_offset = deadline_offset + random.randint(5, 20)
            application_deadline = now + timedelta(days=deadline_offset)
            drive_date = now + timedelta(days=drive_offset)
            rejection_reason = None

            if status == "closed":
                application_deadline = now - timedelta(days=random.randint(5, 35))
                drive_date = application_deadline + timedelta(days=random.randint(3, 12))
            if status == "rejected":
                rejection_reason = "Role requirements were not clear for candidates"

            drives.append(
                PlacementDrive(
                    company_id=company.id,
                    title=title,
                    description=f"{title} role for {company.name}. Hiring for production-grade engineering and problem-solving capability.",
                    job_type=job_type,
                    location=random.choice(locations),
                    salary_lpa=round(random.uniform(4.5, 28.0), 1),
                    eligible_branches=",".join(eligible_branch_list),
                    min_cgpa=min_cgpa,
                    eligible_years=",".join(str(y) for y in eligible_years_list),
                    application_deadline=application_deadline,
                    drive_date=drive_date,
                    status=status,
                    rejection_reason=rejection_reason,
                )
            )

    db.session.add_all(drives)
    db.session.flush()

    open_drives = [d for d in drives if d.status in {"approved", "closed"}]

    applications = []
    status_weights_open = [
        ("applied", 0.46),
        ("shortlisted", 0.16),
        ("waiting", 0.14),
        ("selected", 0.08),
        ("offered", 0.07),
        ("hired", 0.03),
        ("offer_declined", 0.02),
        ("rejected", 0.04),
    ]
    status_weights_closed = [
        ("hired", 0.12),
        ("offered", 0.18),
        ("selected", 0.14),
        ("offer_declined", 0.08),
        ("shortlisted", 0.1),
        ("rejected", 0.3),
        ("waiting", 0.08),
    ]

    cumulative = []
    running = 0.0
    for status, weight in status_weights_open:
        running += weight
        cumulative.append((status, running))

    cumulative_closed = []
    running_closed = 0.0
    for status, weight in status_weights_closed:
        running_closed += weight
        cumulative_closed.append((status, running_closed))

    def choose_status(drive_status):
        r = random.random()
        table = cumulative_closed if drive_status == "closed" else cumulative
        for status, cutoff in table:
            if r <= cutoff:
                return status
        return table[-1][0]

    for student in students:
        target_applications = random.randint(3, 10)

        eligible = [
            d for d in open_drives
            if student.branch in d.eligible_branches_list()
            and student.year in d.eligible_years_list()
            and student.cgpa >= d.min_cgpa
            and d.company_id in {c.id for c in approved_companies}
        ]

        if not eligible:
            continue

        chosen_drives = random.sample(eligible, k=min(target_applications, len(eligible)))
        for drive in chosen_drives:
            status = choose_status(drive.status)
            interview_type = None
            interview_date = None
            remarks = None

            if status in {"shortlisted", "selected", "offered", "hired", "waiting"}:
                interview_type = random.choice(["online", "in-person"])
                interview_date = drive.drive_date - timedelta(days=random.randint(1, 10)) if drive.drive_date else None

            if status == "offered":
                remarks = f"https://offers.example.com/student-{student.id}-{drive.id}"
            elif status == "hired":
                remarks = "Candidate onboarded successfully"
            elif status == "rejected":
                remarks = random.choice([
                    "Technical round did not meet bar",
                    "Communication round not cleared",
                    "Profile mismatch for role",
                ])
            elif status == "waiting":
                remarks = "Awaiting final hiring committee decision"

            applications.append(
                Application(
                    student_id=student.id,
                    drive_id=drive.id,
                    status=status,
                    interview_type=interview_type,
                    interview_date=interview_date,
                    remarks=remarks,
                    applied_at=drive.application_deadline - timedelta(days=random.randint(1, 20)),
                )
            )

    db.session.add_all(applications)
    db.session.flush()

    notifications = []

    for student in random.sample(students, k=min(250, len(students))):
        notifications.append(
            Notification(
                user_id=student.user_id,
                title="New drive matches your profile",
                message="Fresh approved drives are now open for your branch and CGPA.",
                type="info",
                is_read=random.random() < 0.35,
            )
        )

    for app in random.sample(applications, k=min(400, len(applications))):
        title = "Application update"
        notif_type = "info"
        if app.status in {"offered", "hired", "selected"}:
            title = "Great news on your application"
            notif_type = "success"
        elif app.status == "rejected":
            title = "Application status changed"
            notif_type = "warning"

        notifications.append(
            Notification(
                user_id=app.student.user_id,
                title=title,
                message=f"Your application for {app.drive.title} at {app.drive.company.name} is now '{app.status}'.",
                type=notif_type,
                is_read=random.random() < 0.45,
            )
        )

    for company in companies:
        if company.approval_status == "approved":
            notifications.append(
                Notification(
                    user_id=company.user_id,
                    title="Company profile approved",
                    message="Your company can now publish and manage placement drives.",
                    type="success",
                )
            )
        elif company.approval_status == "pending":
            notifications.append(
                Notification(
                    user_id=company.user_id,
                    title="Approval pending",
                    message="Your company profile is under admin review.",
                    type="warning",
                )
            )
        else:
            notifications.append(
                Notification(
                    user_id=company.user_id,
                    title="Company profile rejected",
                    message=company.rejection_reason or "Please resubmit with required compliance information.",
                    type="danger",
                )
            )

    db.session.add_all(notifications)

    db.session.commit()

    return {
        "admin_email": admin_email,
        "admin_password": admin_password,
        "company_password": company_password,
        "student_password": student_password,
        "company_email": company_users[0].email if company_users else "",
        "company_email_2": company_users[1].email if len(company_users) > 1 else "",
        "student_email": student_users[0].email if student_users else "",
        "counts": {
            "companies": len(companies),
            "students": len(students),
            "drives": len(drives),
            "applications": len(applications),
            "notifications": len(notifications),
        },
    }


def main():
    app = create_app("development")
    with app.app_context():
        db.drop_all()
        db.create_all()
        creds = seed_users_and_profiles()

    print("\n✅ Database reset and seeded data inserted successfully.")
    print("\nSeed Summary:")
    print(f"- Companies:    {creds['counts']['companies']}")
    print(f"- Students:     {creds['counts']['students']}")
    print(f"- Drives:       {creds['counts']['drives']}")
    print(f"- Applications: {creds['counts']['applications']}")
    print(f"- Notifications:{creds['counts']['notifications']}")

    print("\nTest Credentials:")
    print(f"- Admin:   {creds['admin_email']} / {creds['admin_password']}")
    print(f"- Company: {creds['company_email']} / {creds['company_password']}")
    if creds["company_email_2"]:
        print(f"- Company: {creds['company_email_2']} / {creds['company_password']}")
    print(f"- Student: {creds['student_email']} / {creds['student_password']}")


if __name__ == "__main__":
    main()
