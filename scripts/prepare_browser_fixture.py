import sys,json,secrets,uuid,os
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description='Prepare synthetic browser fixtures in a dedicated local backend database; never use on a shared VPS database.')
parser.add_argument('--backend', required=True, type=Path)
parser.add_argument('--cleanup',action='store_true',help='Disable only synthetic Phase 5 browser-verification accounts.')
args=parser.parse_args()
root=args.backend.resolve()
if not (root/'scripts/smoke_workflow.py').is_file(): raise SystemExit('Backend local fixture helper not found')
sys.path.insert(0,str(root/'scripts'))
from smoke_workflow import sql,pdf
if args.cleanup:
 sql("UPDATE app_users SET active=false WHERE organization_id IN (SELECT id FROM organizations WHERE name='Synthetic Phase 5 browser verification');")
 print('Synthetic Phase 5 fixture accounts disabled; immutable document/results evidence preserved')
 raise SystemExit(0)
out=Path(__file__).resolve().parents[1]/'.e2e-data'
out.mkdir(mode=0o700,exist_ok=True)
org,security,hr,actor,viewer,outsider=[str(uuid.uuid4()) for _ in range(6)]
password=secrets.token_urlsafe(24)
sql(fr'''\getenv password SMOKE_USER_PASSWORD
BEGIN;
INSERT INTO organizations VALUES ('{org}','Synthetic Phase 5 browser verification');
INSERT INTO departments VALUES ('{security}','{org}','Security'),('{hr}','{org}','HR');
INSERT INTO app_users(id,organization_id,email,password_hash) VALUES
 ('{actor}','{org}','{actor}@test.invalid',crypt(:'password',gen_salt('bf',10))),
 ('{viewer}','{org}','{viewer}@test.invalid',crypt(:'password',gen_salt('bf',10))),
 ('{outsider}','{org}','{outsider}@test.invalid',crypt(:'password',gen_salt('bf',10)));
INSERT INTO memberships VALUES ('{actor}','{security}','ADMIN'),('{actor}','{hr}','ADMIN'),('{viewer}','{security}','VIEWER'),('{viewer}','{hr}','VIEWER'),('{outsider}','{hr}','REVIEWER');
COMMIT;
''',password)
gold=json.loads((root/'evaluation/phase3-golden.json').read_text())
for name,text in [('baseline',gold['baseline']),('replacement',gold['replacement']),('conflicting',gold['cases'][0]['procedure']),('compatible',gold['cases'][1]['procedure'])]:
 (out/(name+'.pdf')).write_bytes(pdf(text))
credentials={'actor':actor+'@test.invalid','viewer':viewer+'@test.invalid','outsider':outsider+'@test.invalid','password':password,'security':security,'hr':hr}
p=out/'credentials.json';p.write_text(json.dumps(credentials));p.chmod(0o600)
print('Created isolated synthetic browser accounts and four PDFs; credentials withheld')
