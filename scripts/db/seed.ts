/**
 * seed.ts — Datos de ejemplo realistas.
 *
 * El perfil `software-app` exige, antes de la entrega, «contenido de muestra
 * que cubra todas las entidades y secciones». Esto es su base: una empresa
 * cliente, usuarios de los cuatro roles, un contacto principal (D-48), un
 * proyecto, entregables de los cuatro tipos con archivo, avisos, y capturas en
 * los TRES estados de sincronización con el CRM.
 *
 * Las capturas en los tres estados no son adorno: sin una `failed` no se puede
 * ver nunca la pantalla de reintento de HQ, y esa pantalla es la mitigación de
 * R-24 (deuda silenciosa del adaptador de dos modos).
 *
 * Se ejecuta con el usuario DUEÑO: sembrar varias empresas a la vez es
 * precisamente lo que las políticas de fila impiden a la aplicación.
 */
import postgres from "postgres";

const URL = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
if (!URL) { console.error("Falta DATABASE_URL_MIGRATIONS o DATABASE_URL."); process.exit(1); }
const sql = postgres(URL, { max: 2, onnotice: () => {} });

const ahora = new Date();
const hace = (dias: number) => new Date(ahora.getTime() - dias * 864e5);

async function main() {
  console.log("Sembrando datos de ejemplo…\n");

  await sql`truncate agent_event, crm_delivery, download_event, lead_capture,
    deliverable, announcement, project, contact, membership, invitation,
    api_key, organization, "user" restart identity cascade`;

  await sql`insert into organization (id,name,slug,type,status) values
    ('org-slg','SLG Agency','slg','slg','active'),
    ('org-demo','Cliente Demo','cliente-demo','client','active'),
    ('org-otro','Otro Cliente','otro-cliente','client','active')`;

  await sql`insert into "user" (id,name,email,email_verified,role,locale) values
    ('u-ricardo','Ricardo Torres Oliva','ricardo@example.test',true,'slg_admin','es'),
    ('u-jessica','Jessica','jessica@example.test',true,'slg_operator','es'),
    ('u-cliente','Ana Directora','ana@clientedemo.test',true,'client_admin','es'),
    ('u-miembro','Luis Equipo','luis@clientedemo.test',true,'client_member','en')`;

  await sql`insert into membership (id,user_id,organization_id,org_role) values
    ('m1','u-ricardo','org-slg','slg_admin'),
    ('m2','u-jessica','org-slg','slg_operator'),
    ('m3','u-cliente','org-demo','client_admin'),
    ('m4','u-miembro','org-demo','client_member')`;

  // D-48: un contacto principal que además tiene cuenta, y otro que no.
  await sql`insert into contact (id,organization_id,name,email,job_title,is_primary,user_id) values
    ('c1','org-demo','Ana Directora','ana@clientedemo.test','Directora General',true,'u-cliente'),
    ('c2','org-demo','Mario Compras','mario@clientedemo.test','Jefe de Compras',false,null)`;

  await sql`insert into project (id,organization_id,name,service,status,owner_user_id,starts_at) values
    ('p-demo','org-demo','Readiness 2026','SLG_Readiness','active','u-jessica',${hace(30)}),
    ('p-otro','org-otro','Implementación','SLG_Implement','active','u-jessica',${hace(10)})`;

  // Los cuatro tipos con archivo, más el enlace. `material` cuelga del proyecto.
  await sql`insert into deliverable
    (id,project_id,organization_id,title,type,file_key,url,version,family_id,visibility,published_at,published_by_type,published_by_id,published_by_label) values
    ('d1','p-demo','org-demo','Informe de preparación','pdf','deliverables/d1.pdf',null,1,'fam-informe','client',${hace(5)},'user','u-jessica','Jessica'),
    ('d2','p-demo','org-demo','Informe de preparación','pdf','deliverables/d2.pdf',null,2,'fam-informe','client',${hace(1)},'user','u-jessica','Jessica'),
    ('d3','p-demo','org-demo','Reporte interactivo','html','deliverables/d3.html',null,1,'fam-reporte','client',${hace(2)},'api_key','k1','Hermes'),
    ('d4','p-demo','org-demo','Notas de la sesión','md','deliverables/d4.md',null,1,'fam-notas','client',${hace(3)},'user','u-jessica','Jessica'),
    ('d5','p-demo','org-demo','Grabación','link',null,'https://example.test/v',1,'fam-video','client',${hace(4)},'user','u-jessica','Jessica'),
    ('d6','p-demo','org-demo','Manual del programa','material','deliverables/d6.pdf',null,1,'fam-manual','client',${hace(6)},'user','u-ricardo','Ricardo')`;

  await sql`insert into announcement (id,organization_id,title,body_md,published_at,author_type,author_id,author_label) values
    ('a1','org-demo','Sesión Cero agendada','Nos vemos el jueves.',${hace(7)},'user','u-ricardo','Ricardo')`;

  // Los TRES estados de sincronización. Sin la `failed`, la pantalla de
  // reintento de HQ nunca se ve y R-24 queda sin mitigación visible.
  await sql`insert into lead_capture
    (id,email,email_domain,name,company,source,download_slug,page_path,locale,consent_at,privacy_version,crm_mode,crm_contact_id,crm_sync_status,crm_attempts,crm_delivered_at,crm_last_error,crm_next_attempt_at) values
    ('l1','ceo@empresa.test','empresa.test','Un CEO','Empresa','download','lo-que-un-director-debe-saber','/ai/academy/phoenix-peex','es',${hace(2)},'v1','contact_note','crm-1','delivered',1,${hace(2)},null,null),
    ('l2','cfo@otra.test','otra.test','Una CFO','Otra','download','lo-que-un-director-debe-saber','/ai/academy/phoenix-peex','es',${hace(1)},'v1',null,null,'pending',0,null,null,${ahora}),
    ('l3','coo@tercera.test','tercera.test','Un COO','Tercera','contact',null,'/contacto','en',${hace(3)},'v1','contact_note',null,'failed',5,null,'El CRM no respondió tras 5 intentos',null)`;

  await sql`insert into download_event (id,lead_capture_id,download_slug,signed_url_issued_at,signed_url_expires_at,completed_at) values
    ('de1','l1','lo-que-un-director-debe-saber',${hace(2)},${hace(2)},${hace(2)})`;

  await sql`insert into api_key (id,name,key_hash,organization_id,scopes,rate_limit_max) values
    ('k1','Hermes — publicación','hash-ejemplo-no-es-una-clave','org-demo',
     ${sql.json(['deliverables:write','announcements:write','events:write'])},60)`;

  await sql`insert into agent_event (id,api_key_id,organization_id,kind,payload_json) values
    ('ev1','k1','org-demo','deliverable.published',${sql.json({ deliverableId: 'd3', projectId: 'p-demo' })}),
    ('ev2','k1','org-demo','informe.generado',${sql.json({ n: 1 })})`;

  const [{ n: orgs }] = await sql`select count(*)::int as n from organization`;
  const [{ n: caps }] = await sql`select count(*)::int as n from lead_capture`;
  const [{ n: dels }] = await sql`select count(*)::int as n from deliverable`;
  console.log(`  ${orgs} organizaciones · 4 usuarios · 2 contactos · 2 proyectos`);
  console.log(`  ${dels} entregables (los 5 tipos, con versión 1 y 2 de una familia)`);
  console.log(`  ${caps} capturas: una entregada, una en cola, una fallida`);
  console.log("\n✓ Datos de ejemplo listos.\n");
  await sql.end({ timeout: 5 });
}
main().catch(async (e) => { console.error("✗", e); await sql.end({ timeout: 5 }); process.exit(1); });
