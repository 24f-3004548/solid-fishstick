import json
from extensions import db
from models import JobRun


def record_job_run(job_name, status, message=None, details=None):
    entry = JobRun(
        job_name=job_name,
        status=status,
        message=message,
        details_json=json.dumps(details or {}, ensure_ascii=False),
    )
    db.session.add(entry)
    db.session.commit()
    return entry
