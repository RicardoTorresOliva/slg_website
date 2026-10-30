import json, sys, pathlib, html
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
FONTS = sys.argv[2]

T = {
 "start-here": dict(theme=dict(bg="#EEF3F8", fg="#24394D", sub="#4A6178", acc="#287ABC", ghost="rgba(40,122,188,.09)"),
   es=dict(eyebrow="Empieza aquí", name="SLG Agency", head="Primero criterio.<br>Después construcción.", tag="Business transformation agency · AI-first, Human-first"),
   en=dict(eyebrow="Start here", name="SLG Agency", head="Judgment first.<br>Then we build.", tag="Business transformation agency · AI-first, Human-first"),
   motif="squares"),
 "phoenix-peex": dict(theme=dict(bg="#24394D", fg="#FFFFFF", sub="#C9D5E1", acc="#F2A33A", ghost="rgba(242,163,58,.10)"),
   es=dict(eyebrow="VoltAi Academy · Para directores", name="Phoenix PEEx", head="Decide sobre IA sin depender<br>de quien te la vende.", tag="Qué preguntar, qué exigir, qué no comprar"),
   en=dict(eyebrow="VoltAi Academy · For directors", name="Phoenix PEEx", head="Decide on AI without relying<br>on whoever sells it to you.", tag="What to ask, what to demand, what not to buy"),
   motif="flame"),
 "phoenix-teax": dict(theme=dict(bg="#287ABC", fg="#FFFFFF", sub="#DCEBF7", acc="#0F2436", ghost="rgba(255,255,255,.10)"),
   es=dict(eyebrow="VoltAi Academy · Para la alta gerencia", name="Phoenix TEAx", head="De la decisión del directorio<br>a la operación.", tag="Un equipo gerencial que decide con los mismos criterios"),
   en=dict(eyebrow="VoltAi Academy · For senior management", name="Phoenix TEAx", head="From the board's decision<br>to daily operations.", tag="One leadership team, one shared set of criteria"),
   motif="team"),
 "readiness": dict(theme=dict(bg="#0E1A26", fg="#FFFFFF", sub="#AFC2D4", acc="#5FB4E8", ghost="rgba(95,180,232,.08)"),
   es=dict(eyebrow="VoltAi Enterprise · Diagnóstico", name="SLG_Readiness", head="¿Dónde está realmente<br>tu empresa frente a la IA?", tag="11 dimensiones · evidencia por cada una · antes de invertir"),
   en=dict(eyebrow="VoltAi Enterprise · Diagnostic", name="SLG_Readiness", head="Where does your company<br>really stand on AI?", tag="11 dimensions · evidence for each · before you invest"),
   motif="bars"),
 "implement": dict(theme=dict(bg="#0F4C5C", fg="#FFFFFF", sub="#C3DEE3", acc="#7FD1AE", ghost="rgba(127,209,174,.10)"),
   es=dict(eyebrow="VoltAi Enterprise · Implementación", name="SLG_Implement", head="Del piloto al despliegue,<br>fase por fase.", tag="Compuertas de aprobación tuyas · sobre tu stack · sin lock-in"),
   en=dict(eyebrow="VoltAi Enterprise · Implementation", name="SLG_Implement", head="From pilot to rollout,<br>phase by phase.", tag="Your approval gates · on your stack · no lock-in"),
   motif="steps"),
}

def motif(kind, t):
    a, g = t["acc"], t["fg"]
    if kind == "squares":
        return f'''<svg width="380" height="380" viewBox="0 0 380 380"><rect x="40" y="40" width="210" height="210" fill="none" stroke="{a}" stroke-width="10"/>
        <rect x="130" y="130" width="210" height="210" fill="{a}" opacity=".9"/><text x="235" y="318" fill="#fff" font-size="56" font-weight="800" text-anchor="middle">AI</text>
        <text x="145" y="110" fill="{t['fg']}" font-size="22" font-weight="700" text-anchor="middle">HUMAN</text></svg>'''
    if kind == "flame":
        return f'''<svg width="380" height="400" viewBox="0 0 380 400"><path d="M190 30 C 240 120, 330 160, 300 270 C 280 340, 230 370, 190 370 C 150 370, 100 340, 80 270 C 60 200, 120 170, 140 110 C 160 160, 180 170, 190 30 Z" fill="none" stroke="{a}" stroke-width="10"/>
        <path d="M190 170 C 215 220, 255 240, 240 295 C 230 330, 210 340, 190 340 C 170 340, 150 330, 140 295 C 130 255, 170 235, 190 170 Z" fill="{a}"/></svg>'''
    if kind == "team":
        import math
        pts=[(190+140*math.cos(2*math.pi*i/8-math.pi/2),190+140*math.sin(2*math.pi*i/8-math.pi/2)) for i in range(8)]
        lines="".join(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="190" y2="190" stroke="{g}" stroke-opacity=".45" stroke-width="3"/>' for x,y in pts)
        ring="".join(f'<line x1="{pts[i][0]:.0f}" y1="{pts[i][1]:.0f}" x2="{pts[(i+1)%8][0]:.0f}" y2="{pts[(i+1)%8][1]:.0f}" stroke="{g}" stroke-opacity=".8" stroke-width="4"/>' for i in range(8))
        dots="".join(f'<rect x="{x-17:.0f}" y="{y-17:.0f}" width="34" height="34" fill="{g}"/>' for x,y in pts)
        return f'<svg width="380" height="380" viewBox="0 0 380 380">{lines}{ring}{dots}<rect x="160" y="160" width="60" height="60" fill="{a}"/></svg>'
    if kind == "steps":
        out=""
        for i in range(4):
            x=10+i*92; h=80+i*70
            out+=f'<rect x="{x}" y="{340-h}" width="70" height="{h}" fill="{a}" opacity="{0.55+0.15*i:.2f}"/>'
            if i<3: out+=f'<line x1="{x+81}" y1="{330-h-60}" x2="{x+81}" y2="340" stroke="{g}" stroke-width="4" stroke-dasharray="10 8"/>'
        return f'<svg width="300" height="300" viewBox="0 0 380 380">{out}<line x1="0" y1="348" x2="380" y2="348" stroke="{g}" stroke-opacity=".5" stroke-width="3"/></svg>'
    if kind == "bars":
        hs=[150,220,120,260,190,90,240,170,280,130,210]
        bars="".join(f'<rect x="{12+i*33}" y="{320-h}" width="22" height="{h}" fill="{a}" opacity="{0.45+0.5*(h/280):.2f}"/>' for i,h in enumerate(hs))
        return f'''<svg width="300" height="300" viewBox="0 0 380 380">{bars}<line x1="0" y1="328" x2="380" y2="328" stroke="{g}" stroke-opacity=".5" stroke-width="3"/>
        <text x="190" y="372" fill="{t['sub']}" font-size="26" font-weight="700" text-anchor="middle">11</text></svg>'''

def page(key, lang):
    d=T[key]; t=d["theme"]; c=d[lang]
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:M;src:url(file://{FONTS}/Montserrat-500.ttf);font-weight:500}}
@font-face{{font-family:M;src:url(file://{FONTS}/Montserrat-600.ttf);font-weight:600}}
@font-face{{font-family:M;src:url(file://{FONTS}/Montserrat-700.ttf);font-weight:700}}
@font-face{{font-family:M;src:url(file://{FONTS}/Montserrat-800.ttf);font-weight:800}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1200px;height:627px;overflow:hidden;background:{t['bg']};font-family:M,sans-serif;color:{t['fg']};position:relative}}
.bar{{position:absolute;left:0;top:0;width:16px;height:100%;background:{t['acc']}}}
.wrap{{position:absolute;left:80px;top:64px;width:720px;height:500px;display:flex;flex-direction:column}}
.eyebrow{{font-size:22px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:{t['acc']}}}
.name{{font-size:{'84px' if key in ('readiness','implement') else '96px'};font-weight:800;letter-spacing:-.02em;line-height:1;margin-top:22px}}
.head{{font-size:40px;font-weight:700;line-height:1.2;margin-top:30px}}
.tag{{font-size:23px;font-weight:500;color:{t['sub']};margin-top:22px}}
.foot{{margin-top:auto;font-size:20px;font-weight:600;color:{t['sub']};display:flex;gap:18px;align-items:center}}
.foot b{{color:{t['fg']};font-weight:800}}
.sq{{width:12px;height:12px;background:{t['acc']};display:inline-block}}
.motif{{position:absolute;right:60px;top:50%;transform:translateY(-50%)}}
svg text{{font-family:M,sans-serif}}
</style></head><body><div class="bar"></div>
<div class="wrap"><div class="eyebrow">{c['eyebrow']}</div><div class="name">{html.escape(c['name'])}</div>
<div class="head">{c['head']}</div><div class="tag">{html.escape(c['tag'])}</div>
<div class="foot"><b>SLG Agency</b><span class="sq"></span><span>softlandingglobal.com</span></div></div>
<div class="motif">{motif(d['motif'], t)}</div></body></html>'''

for k in T:
    for l in ("es","en"):
        (OUT/f"{k}-{l}.html").write_text(page(k,l))
print("ok")
