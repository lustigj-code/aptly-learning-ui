#!/usr/bin/env python3
"""
Update production checklist task status.
Usage: echo '{"task": "vitest_setup", "status": "completed"}' | python3 update-checklist.py
"""

import json
import sys
import os
from datetime import datetime

PROJECT_DIR = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
CHECKLIST_FILE = os.path.join(PROJECT_DIR, '.claude', 'production-checklist.json')

def main():
    try:
        # Read input
        input_data = json.load(sys.stdin)
        task_id = input_data.get('task')
        new_status = input_data.get('status', 'completed')

        if not task_id:
            print('{"error": "No task specified"}')
            return

        # Load checklist
        with open(CHECKLIST_FILE, 'r') as f:
            checklist = json.load(f)

        # Find and update task
        updated = False
        for phase_id, phase in checklist.get('phases', {}).items():
            tasks = phase.get('tasks', {})
            if task_id in tasks:
                tasks[task_id]['status'] = new_status
                tasks[task_id]['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
                updated = True
                break

        if not updated:
            print(json.dumps({"error": f"Task '{task_id}' not found"}))
            return

        # Update timestamp
        checklist['lastUpdated'] = datetime.utcnow().isoformat() + 'Z'

        # Save
        with open(CHECKLIST_FILE, 'w') as f:
            json.dump(checklist, f, indent=2)

        # Calculate progress
        total = sum(len(p.get('tasks', {})) for p in checklist['phases'].values())
        completed = sum(
            1 for p in checklist['phases'].values()
            for t in p.get('tasks', {}).values()
            if t.get('status') == 'completed'
        )

        print(json.dumps({
            "success": True,
            "task": task_id,
            "status": new_status,
            "progress": f"{completed}/{total}",
            "percentage": round(completed * 100 / total) if total > 0 else 0
        }))

    except FileNotFoundError:
        print('{"error": "Checklist file not found. Run production-tracker.sh first."}')
    except json.JSONDecodeError:
        print('{"error": "Invalid JSON input"}')
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == '__main__':
    main()
