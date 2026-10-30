"""Parse workflow YAML before publishing; not a substitute for remote Actions."""
from pathlib import Path
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]


class WorkflowSyntaxTests(unittest.TestCase):
    def test_workflows_parse_and_commands_are_scalar_text(self):
        paths = sorted((ROOT / '.github/workflows').glob('*.yml'))
        paths += sorted((ROOT / '.github/workflows').glob('*.yaml'))
        self.assertTrue(paths, 'No workflows found')
        for path in paths:
            with self.subTest(workflow=path.name):
                workflow = yaml.safe_load(path.read_text(encoding='utf-8'))
                self.assertIsInstance(workflow, dict)
                self.assertIsInstance(workflow['jobs'], dict)
                for name, job in workflow['jobs'].items():
                    if 'uses' in job:  # Reusable-workflow job.
                        self.assertIsInstance(job['uses'], str)
                        continue
                    self.assertIsInstance(job['steps'], list, name)
                    for step in job['steps']:
                        self.assertIsInstance(step, dict)
                        self.assertNotEqual('run' in step, 'uses' in step,
                                            f'{name}: supply run or uses')
                        command = step.get('run', step.get('uses'))
                        self.assertIsInstance(command, str,
                                              f'{name}: quote colon-bearing commands or use a block')
                        self.assertTrue(command.strip(), name)


if __name__ == '__main__':
    unittest.main()
