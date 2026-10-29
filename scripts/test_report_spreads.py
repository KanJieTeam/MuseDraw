"""Integrity checks for original report seeds, not aesthetic certification."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
SCRIPTS=ROOT/'skills/musedraw/scripts'
sys.path.insert(0,str(SCRIPTS))
spec=importlib.util.spec_from_file_location('build_report',SCRIPTS/'build_report.py')
report=importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)
ASSETS=ROOT/'skills/musedraw/assets/report-spreads'


class ReportSpreadsTests(unittest.TestCase):
    def load(self,name):return json.loads((ASSETS/name).read_text(encoding='utf-8'))

    def test_changed_allocations_recompute_without_old_example_numbers(self):
        data=self.load('budget-demo.json')
        data.update(total=180,reserve=18,items=[{'name':'设备','value':99},{'name':'测试','value':63}])
        report.validate(data)
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp)/'changed'
            report.build(data,out,ASSETS)
            derived=json.loads((out/'derived.json').read_text())
            self.assertEqual(derived['allocated'],162)
            self.assertEqual(derived['reserve_fraction'],.1)
            text=(out/'index.html').read_text(encoding='utf-8')
            self.assertNotIn('108',text)
            self.assertIn('162',text)
            self.assertTrue((out/'chart.png').is_file())

    def test_budget_mismatch_is_rejected_not_hidden_in_reserve(self):
        data=self.load('budget-demo.json');data['items'][0]['value']+=1
        with self.assertRaisesRegex(ValueError,'equal total'):report.validate(data)

    def test_focus_missing_or_duplicated_is_not_a_statistic(self):
        for value in [None,'unknown']:
            data=self.load('urban-demo.json');data['series'][0]['points'][1]['y']=value
            with self.assertRaisesRegex(ValueError,'focus observation'):report.validate(data)
        data=self.load('urban-demo.json')
        data['series'][0]['points'].append(copy.deepcopy(data['series'][0]['points'][1]))
        with self.assertRaisesRegex(ValueError,'focus observation'):report.validate(data)

    def test_missing_illustration_does_not_create_placeholder_or_output(self):
        data=self.load('urban-demo.json');data['illustration']='missing-unprovided.png'
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp)/'missing'
            with self.assertRaisesRegex(ValueError,'Illustration asset missing'):report.build(data,out,Path(temp))
            self.assertFalse(out.exists())

    def test_existing_output_preserved_and_copy_escapes_user_text(self):
        data=self.load('budget-demo.json');data['title']=['<script>alert(1)</script>']
        text=report.document(data,{'allocated':108})
        self.assertNotIn('<script>',text)
        self.assertIn('&lt;script&gt;',text)
        with tempfile.TemporaryDirectory() as temp:
            marker=Path(temp)/'user.txt';marker.write_text('keep')
            with self.assertRaises(FileExistsError):report.build(data,Path(temp),ASSETS)
            self.assertEqual(marker.read_text(),'keep')


if __name__=='__main__':unittest.main()
