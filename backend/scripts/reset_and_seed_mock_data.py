import os
from datetime import datetime, timedelta

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import User, Student, Company, PlacementDrive, Application, Notification


BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)


def seed_users_and_profiles():
    admin_email = os.getenv("ADMIN_EMAIL", "admin@placement.com").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@1234")

    admin = User(
        email=admin_email,
        password_hash=generate_password_hash(admin_password),
        role="admin",
        is_active=True,
    )

    company_users = [
        User(email="hr@amazon.com", password_hash=generate_password_hash("Company@123"), role="company", is_active=True),
        User(email="careers@microsoft.com", password_hash=generate_password_hash("Company@123"), role="company", is_active=True),
        User(email="hiring@startupx.io", password_hash=generate_password_hash("Company@123"), role="company", is_active=True),
    ]

    student_users = [
        User(email="student1@test.com", password_hash=generate_password_hash("Student@123"), role="student", is_active=True),
        User(email="student2@test.com", password_hash=generate_password_hash("Student@123"), role="student", is_active=True),
        User(email="student3@test.com", password_hash=generate_password_hash("Student@123"), role="student", is_active=True),
        User(email="student4@test.com", password_hash=generate_password_hash("Student@123"), role="student", is_active=True),
        User(email="student5@test.com", password_hash=generate_password_hash("Student@123"), role="student", is_active=True),
    ]

    db.session.add(admin)
    db.session.add_all(company_users)
    db.session.add_all(student_users)
    db.session.flush()

    companies = [
        Company(
            user_id=company_users[0].id,
            name="Amazon",
            description="Global e-commerce and cloud company",
            website="https://www.amazon.jobs",
            industry="Technology",
            location="Bangalore",
            hr_name="Riya Sharma",
            hr_email="hr@amazon.com",
            hr_phone="+91-9000000001",
            approval_status="approved",
            is_blacklisted=False,
        ),
        Company(
            user_id=company_users[1].id,
            name="Microsoft",
            description="Cloud and productivity solutions company",
            website="https://careers.microsoft.com",
            industry="Technology",
            location="Hyderabad",
            hr_name="Kunal Verma",
            hr_email="careers@microsoft.com",
            hr_phone="+91-9000000002",
            approval_status="approved",
            is_blacklisted=False,
        ),
        Company(
            user_id=company_users[2].id,
            name="StartupX",
            description="Early-stage SaaS startup",
            website="https://startupx.io",
            industry="SaaS",
            location="Remote",
            hr_name="Nikita Rao",
            hr_email="hiring@startupx.io",
            hr_phone="+91-9000000003",
            approval_status="pending",
            is_blacklisted=False,
        ),
    ]

    students = [
        Student(
            user_id=student_users[0].id,
            full_name="Aman Gupta",
            phone="+919900000001",
            dob=datetime(2003, 1, 10).date(),
            roll_number="CS2024001",
            branch="CS",
            year=4,
            cgpa=8.7,
        ),
        Student(
            user_id=student_users[1].id,
            full_name="Priya Singh",
            phone="+919900000002",
            dob=datetime(2003, 3, 21).date(),
            roll_number="IT2024002",
            branch="IT",
            year=4,
            cgpa=9.1,
        ),
        Student(
            user_id=student_users[2].id,
            full_name="Rahul Das",
            phone="+919900000003",
            dob=datetime(2004, 6, 12).date(),
            roll_number="ECE2025001",
            branch="ECE",
            year=3,
            cgpa=7.8,
        ),
        Student(
            user_id=student_users[3].id,
            full_name="Sneha Iyer",
            phone="+919900000004",
            dob=datetime(2004, 8, 2).date(),
            roll_number="EE2025004",
            branch="EE",
            year=3,
            cgpa=8.2,
        ),
        Student(
            user_id=student_users[4].id,
            full_name="Vikas Patel",
            phone="+919900000005",
            dob=datetime(2005, 2, 5).date(),
            roll_number="ME2026002",
            branch="ME",
            year=2,
            cgpa=7.1,
        ),
    ]

    db.session.add_all(companies)
    db.session.add_all(students)
    db.session.flush()

    now = datetime.utcnow()
    drives = [
        PlacementDrive(
            company_id=companies[0].id,
            title="SDE-1 Full Time",
            description="Backend/API development role",
            job_type="full-time",
            location="Bangalore",
            salary_lpa=18.0,
            eligible_branches="CS,IT,ECE",
            min_cgpa=8.0,
            eligible_years="4",
            application_deadline=now + timedelta(days=8),
            drive_date=now + timedelta(days=15),
            status="approved",
        ),
        PlacementDrive(
            company_id=companies[0].id,
            title="QA Engineer",
            description="Testing and automation",
            job_type="full-time",
            location="Hyderabad",
            salary_lpa=10.0,
            eligible_branches="CS,IT,EE",
            min_cgpa=7.0,
            eligible_years="3,4",
            application_deadline=now + timedelta(days=4),
            drive_date=now + timedelta(days=10),
            status="pending",
        ),
        PlacementDrive(
            company_id=companies[1].id,
            title="Software Intern",
            description="6-month internship",
            job_type="internship",
            location="Remote",
            salary_lpa=6.0,
            eligible_branches="CS,IT,ECE",
            min_cgpa=7.5,
            eligible_years="3,4",
            application_deadline=now + timedelta(days=6),
            drive_date=now + timedelta(days=12),
            status="approved",
        ),
        PlacementDrive(
            company_id=companies[1].id,
            title="Data Analyst",
            description="Analytics and dashboards",
            job_type="full-time",
            location="Noida",
            salary_lpa=12.0,
            eligible_branches="CS,IT,EE",
            min_cgpa=8.0,
            eligible_years="4",
            application_deadline=now + timedelta(days=5),
            drive_date=now + timedelta(days=13),
            status="rejected",
            rejection_reason="Role requirements not clearly defined",
        ),
        PlacementDrive(
            company_id=companies[0].id,
            title="Support Engineer",
            description="Closed drive sample",
            job_type="full-time",
            location="Pune",
            salary_lpa=7.0,
            eligible_branches="CS,IT",
            min_cgpa=6.5,
            eligible_years="4",
            application_deadline=now - timedelta(days=5),
            drive_date=now - timedelta(days=2),
            status="closed",
        ),
    ]

    db.session.add_all(drives)
    db.session.flush()

    applications = [
        Application(student_id=students[0].id, drive_id=drives[0].id, status="hired", remarks="Joined successfully"),
        Application(student_id=students[1].id, drive_id=drives[0].id, status="offered", remarks="https://example.com/offer/student2"),
        Application(student_id=students[2].id, drive_id=drives[0].id, status="shortlisted", interview_type="online", interview_date=now + timedelta(days=2), remarks="Round 1 cleared"),
        Application(student_id=students[3].id, drive_id=drives[2].id, status="selected", interview_type="in-person", interview_date=now + timedelta(days=3), remarks="Selected for final round"),
        Application(student_id=students[4].id, drive_id=drives[2].id, status="rejected", remarks="CGPA below threshold"),
        Application(student_id=students[0].id, drive_id=drives[2].id, status="waiting", remarks="Awaiting final decision"),
    ]

    db.session.add_all(applications)
    db.session.flush()

    notifications = [
        Notification(user_id=students[0].user_id, title="You are hired", message="Congrats! You have been marked as hired.", type="success"),
        Notification(user_id=students[1].user_id, title="Offer letter sent", message="Please check your email for the offer letter.", type="info"),
        Notification(user_id=students[2].user_id, title="Interview scheduled", message="Your interview has been scheduled.", type="warning"),
        Notification(user_id=companies[0].user_id, title="Drive approved", message="SDE-1 Full Time has been approved.", type="success"),
        Notification(user_id=companies[1].user_id, title="Drive rejected", message="Data Analyst drive was rejected by admin.", type="danger"),
    ]
    db.session.add_all(notifications)

    db.session.commit()

    return {
        "admin_email": admin_email,
        "admin_password": admin_password,
    }


def main():
    app = create_app("development")
    with app.app_context():
        db.drop_all()
        db.create_all()
        creds = seed_users_and_profiles()

    print("\n✅ Database reset and mock data inserted successfully.")
    print("\nTest Credentials:")
    print(f"- Admin:   {creds['admin_email']} / {creds['admin_password']}")
    print("- Company: hr@amazon.com / Company@123")
    print("- Company: careers@microsoft.com / Company@123")
    print("- Student: student1@test.com / Student@123")
    print("- Student: student2@test.com / Student@123")


if __name__ == "__main__":
    main()
