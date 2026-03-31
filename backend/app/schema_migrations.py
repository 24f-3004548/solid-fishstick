from sqlalchemy import inspect, text

from app.extensions import db


def run_schema_migrations() -> None:
    _remove_students_roll_number_column()


def _remove_students_roll_number_column() -> None:
    engine = db.engine
    inspector = inspect(engine)

    if "students" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("students")}
    if "roll_number" not in columns:
        return

    if engine.dialect.name == "sqlite":
        with engine.connect() as conn:
            # Prefer native column drop for modern SQLite versions.
            try:
                conn.execute(text("ALTER TABLE students DROP COLUMN roll_number"))
                conn.commit()
                return
            except Exception:
                conn.rollback()

            conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
            conn.execute(text(
                """
                CREATE TABLE students__new (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL UNIQUE,
                    full_name VARCHAR(120) NOT NULL,
                    phone VARCHAR(20),
                    dob DATE,
                    branch VARCHAR(100) NOT NULL,
                    year INTEGER NOT NULL,
                    cgpa FLOAT NOT NULL,
                    resume_path VARCHAR(300),
                    is_blacklisted BOOLEAN NOT NULL DEFAULT 0,
                    blacklist_reason VARCHAR(300),
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users (id)
                )
                """
            ))
            conn.execute(text(
                """
                INSERT INTO students__new (
                    id, user_id, full_name, phone, dob, branch, year, cgpa,
                    resume_path, is_blacklisted, blacklist_reason, created_at, updated_at
                )
                SELECT
                    id, user_id, full_name, phone, dob, branch, year, cgpa,
                    resume_path, is_blacklisted, blacklist_reason, created_at, updated_at
                FROM students
                """
            ))
            conn.execute(text("DROP TABLE students"))
            conn.execute(text("ALTER TABLE students__new RENAME TO students"))
            conn.exec_driver_sql("PRAGMA foreign_keys=ON")
            conn.commit()
            return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE students DROP COLUMN roll_number"))
