# server.py
from __future__ import annotations
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from Crypto.Cipher import AES
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
from uuid import uuid4
from flask_sqlalchemy import SQLAlchemy
import base64, os, re, json, requests

# =========================
# Paths e Flask
# =========================
load_dotenv()
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "materials.db"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)
CORS(app)

# =========================
# Login (AES-CBC compatível com o front)
# =========================
SECRET_KEY = b"1234567890abcdef"   # 16 bytes
IV         = b"abcdef1234567890"   # 16 bytes

def decrypt_password(cipher_b64: str) -> str:
    cipher_bytes = base64.b64decode(cipher_b64)
    cipher = AES.new(SECRET_KEY, AES.MODE_CBC, IV)
    plain = cipher.decrypt(cipher_bytes)
    pad = plain[-1]
    return plain[:-pad].decode("utf-8", errors="ignore")

USERS = {"admin": "admin123", "visitante": "visitante123"}

# =========================
# Banco (SQLAlchemy)
# =========================
class Material(db.Model):
    id = db.Column(db.String, primary_key=True)
    fornecedor = db.Column(db.String)
    cnpj_entregador = db.Column(db.String)
    denominacao = db.Column(db.String)
    cod_peca = db.Column(db.String)
    item = db.Column(db.String)
    operador = db.Column(db.String)
    data_rec = db.Column(db.String)
    qtd_recebida = db.Column(db.Integer)
    qtd_amarrados = db.Column(db.Integer)
    corrida = db.Column(db.String)
    lote = db.Column(db.String)
    localizacao_ninho = db.Column(db.String)
    descricao_produto = db.Column(db.Text)
    observacao = db.Column(db.Text)
    created_at = db.Column(db.String)
    updated_at = db.Column(db.String)

    def to_dict(self):
        # JSON no padrão esperado pelo front (camelCase)
        return {
            "id": self.id,
            "fornecedor": self.fornecedor,
            "cnpjEntregador": self.cnpj_entregador,
            "denominacao": self.denominacao,
            "codPeca": self.cod_peca,
            "item": self.item,
            "operador": self.operador,
            "dataRec": self.data_rec,
            "qtdRecebida": self.qtd_recebida,
            "qtdAmarrados": self.qtd_amarrados,
            "corrida": self.corrida,
            "lote": self.lote,
            "localizacaoNinho": self.localizacao_ninho,
            "descricaoProduto": self.descricao_produto,
            "observacao": self.observacao,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

with app.app_context():
    db.create_all()

# =========================
# Páginas
# =========================
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "login.html")

@app.route("/home")
def home():
    return send_from_directory(app.static_folder, "homepage.html")

# =========================
# Login
# =========================
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "")
    cipher   = data.get("password", "")
    try:
        password = decrypt_password(cipher)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Falha ao descriptografar: {e}"}), 400
    if USERS.get(username) == password:
        return jsonify({"ok": True, "userType": "admin" if username == "admin" else "visitor"})
    return jsonify({"ok": False, "error": "Credenciais inválidas"}), 401

# =========================
# API: Materiais (CRUD)
# =========================
def _now_iso():
    return datetime.utcnow().isoformat()

@app.route("/api/materials", methods=["GET"])
def list_materials():
    rows = Material.query.all()
    return jsonify([r.to_dict() for r in rows])

@app.route("/api/materials/<id>", methods=["GET"])
def get_material(id):
    r = db.session.get(Material, id)
    if not r: return jsonify({"error": "not found"}), 404
    return jsonify(r.to_dict())

@app.route("/api/materials", methods=["POST"])
def create_material():
    d = request.get_json(silent=True) or {}
    mid = d.get("id") or str(uuid4())
    if db.session.get(Material, mid):
        return jsonify({"error": "id já existe"}), 409
    now = _now_iso()
    r = Material(
        id=mid,
        fornecedor=d.get("fornecedor"),
        cnpj_entregador=d.get("cnpjEntregador"),
        denominacao=d.get("denominacao"),
        cod_peca=d.get("codPeca"),
        item=d.get("item"),
        operador=d.get("operador"),
        data_rec=d.get("dataRec"),
        qtd_recebida=d.get("qtdRecebida"),
        qtd_amarrados=d.get("qtdAmarrados"),
        corrida=d.get("corrida"),
        lote=d.get("lote"),
        localizacao_ninho=d.get("localizacaoNinho"),
        descricao_produto=d.get("descricaoProduto"),
        observacao=d.get("observacao"),
        created_at=now, updated_at=now
    )
    db.session.add(r)
    db.session.commit()
    return jsonify(r.to_dict()), 201

@app.route("/api/materials/<id>", methods=["PUT"])
def update_material(id):
    r = db.session.get(Material, id)
    if not r: return jsonify({"error": "not found"}), 404
    d = request.get_json(silent=True) or {}
    r.fornecedor = d.get("fornecedor", r.fornecedor)
    r.cnpj_entregador = d.get("cnpjEntregador", r.cnpj_entregador)
    r.denominacao = d.get("denominacao", r.denominacao)
    r.cod_peca = d.get("codPeca", r.cod_peca)
    r.item = d.get("item", r.item)
    r.operador = d.get("operador", r.operador)
    r.data_rec = d.get("dataRec", r.data_rec)
    r.qtd_recebida = d.get("qtdRecebida", r.qtd_recebida)
    r.qtd_amarrados = d.get("qtdAmarrados", r.qtd_amarrados)
    r.corrida = d.get("corrida", r.corrida)
    r.lote = d.get("lote", r.lote)
    r.localizacao_ninho = d.get("localizacaoNinho", r.localizacao_ninho)
    r.descricao_produto = d.get("descricaoProduto", r.descricao_produto)
    r.observacao = d.get("observacao", r.observacao)
    r.updated_at = _now_iso()
    db.session.commit()
    return jsonify(r.to_dict())

@app.route("/api/materials/<id>", methods=["DELETE"])
def delete_material(id):
    r = db.session.get(Material, id)
    if not r: return jsonify({"error": "not found"}), 404
    db.session.delete(r)
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/export", methods=["GET"])
def export_all():
    rows = Material.query.all()
    return jsonify([r.to_dict() for r in rows])

@app.route("/api/import", methods=["POST"])
def import_bulk():
    payload = request.get_json(silent=True) or []
    if not isinstance(payload, list):
        return jsonify({"error":"esperado array de objetos"}), 400
    new_cnt, upd_cnt = 0, 0
    for d in payload:
        mid = d.get("id") or str(uuid4())
        r = db.session.get(Material, mid)
        if not r:
            r = Material(id=mid, created_at=_now_iso())
            db.session.add(r)
            new_cnt += 1
        else:
            upd_cnt += 1
        r.fornecedor = d.get("fornecedor")
        r.cnpj_entregador = d.get("cnpjEntregador")
        r.denominacao = d.get("denominacao")
        r.cod_peca = d.get("codPeca")
        r.item = d.get("item")
        r.operador = d.get("operador")
        r.data_rec = d.get("dataRec")
        r.qtd_recebida = d.get("qtdRecebida")
        r.qtd_amarrados = d.get("qtdAmarrados")
        r.corrida = d.get("corrida")
        r.lote = d.get("lote")
        r.localizacao_ninho = d.get("localizacaoNinho")
        r.descricao_produto = d.get("descricaoProduto")
        r.observacao = d.get("observacao")
        r.updated_at = _now_iso()
    db.session.commit()
    return jsonify({"ok": True, "new": new_cnt, "updated": upd_cnt})

# =========================
# Util: parser JSON robusto para respostas do LLM
# =========================
def parse_json_strict(content: str):
    s = (content or "").strip()
    # remove cercas ```json ... ```
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z]*\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    # tentativa direta
    try:
        return json.loads(s)
    except Exception:
        pass
    # fallback: tenta menor bloco JSON válido
    # usa um parser recursivo de chaves com regex compatível
    stack = []
    start = None
    for i, ch in enumerate(s):
        if ch == '{':
            if not stack:
                start = i
            stack.append('{')
        elif ch == '}':
            if stack:
                stack.pop()
                if not stack and start is not None:
                    try:
                        return json.loads(s[start:i+1])
                    except Exception:
                        start = None
                        continue
    raise ValueError("não foi possível extrair JSON válido")

# =========================
# API: Llama (Ollama por padrão; OpenAI-compatible opcional)
# =========================
def call_llm(messages, temperature=0.2):
    # OpenAI-compatible
    oa_url = os.environ.get("OPENAI_COMPAT_URL", "").strip()
    if oa_url:
        api_key = os.environ.get("OPENAI_COMPAT_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("OPENAI_COMPAT_API_KEY vazio")
        model = os.environ.get("LLM_MODEL", "llama3-8b-8192").strip()  # ajuste padrão p/ Groq

        base = oa_url.rstrip("/")
        # ajuste automático para Groq se necessário
        if "groq.com" in base and not base.endswith("/openai/v1"):
            base += "/openai/v1"
        url = base + "/chat/completions"

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": False,
            # força JSON quando o provedor suporta OpenAI response_format
            "response_format": {"type": "json_object"}
        }
        r = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=payload,
            timeout=180
        )
        r.raise_for_status()
        jr = r.json()
        return jr["choices"][0]["message"]["content"]

    # Ollama
    ollama_url = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434/api/chat").strip()
    model = os.environ.get("LLM_MODEL", "llama3:8b").strip()
    r = requests.post(
        ollama_url,
        json={
            "model": model,
            "messages": messages,
            "options": {"temperature": temperature},
            "stream": False
        },
        timeout=180
    )
    r.raise_for_status()
    jr = r.json()
    return jr.get("message", {}).get("content", "")

@app.route("/api/llama/extract", methods=["POST"])
def llama_extract():
    data = request.get_json(silent=True) or {}
    mode = data.get("mode") or "structured"
    text = (data.get("text") or "")[:50000]
    if not text.strip():
        return jsonify({"error": "texto vazio"}), 400

    if mode == "structured":
        system = (
            "Você é um extrator de campos estruturados de notas/documentos de recebimento de materiais. "
            "Responda APENAS com JSON válido. "
            "Campos: fornecedor, cnpjEntregador, denominacao, codPeca, lote, corrida, dataRec (YYYY-MM-DD), "
            "qtdRecebida (inteiro), qtdAmarrados (inteiro), localizacaoNinho (se existir). "
            "Inclua um objeto 'confidence' com chaves iguais aos campos (0.0–1.0)."
        )
        user = f"Documento:\n```\n{text}\n```\nExtraia os campos especificados."
    else:
        system = (
            "Gere campos de texto livre a partir de um documento técnico de materiais. "
            "Responda APENAS com JSON válido com chaves: descricaoProduto, observacao, confidence (0.0–1.0)."
        )
        user = f"Documento:\n```\n{text}\n```\nGere 'descricaoProduto' e 'observacao'."

    try:
        content = call_llm(
            [
                {"role":"system","content":system},
                {"role":"user","content":user}
            ],
            temperature=0.2
        )
    except Exception as e:
        return jsonify({"error": f"Falha ao consultar LLM: {e}"}), 502

    # Parser JSON robusto
    try:
        parsed = parse_json_strict(content)
    except Exception:
        return jsonify({"error": "Resposta do LLM não é JSON válido", "raw": content}), 500

    suggestions = []
    if mode == "structured":
        field_map = {
            "fornecedor": "fornecedor",
            "cnpjEntregador": "cnpj-entregador",
            "denominacao": "denominacao",
            "codPeca": "cod-peca",
            "lote": "lote",
            "corrida": "corrida",
            "dataRec": "data-rec",
            "qtdRecebida": "qtd-recebida",
            "qtdAmarrados": "qtd-amarrados",
            "localizacaoNinho": "localizacao-ninho",
        }
        conf = parsed.get("confidence", {})
        for k, html_id in field_map.items():
            if k in parsed:
                try:
                    c = float(conf.get(k, 0.7) or 0.7)
                except Exception:
                    c = 0.7
                suggestions.append({"field": html_id, "value": str(parsed[k]), "confidence": c})
    else:
        try:
            conf = float(parsed.get("confidence", 0.7) or 0.7)
        except Exception:
            conf = 0.7
        if "descricaoProduto" in parsed:
            suggestions.append({"field": "descricao-produto", "value": str(parsed["descricaoProduto"]), "confidence": conf})
        if "observacao" in parsed:
            suggestions.append({"field": "observacao", "value": str(parsed["observacao"]), "confidence": conf})

    return jsonify({"suggestions": suggestions})

# =========================
# Main
# =========================
if __name__ == "__main__":
    print("STATIC_DIR:", STATIC_DIR)
    print("DB_PATH   :", DB_PATH)
    app.run(host="127.0.0.1", port=5000, debug=True)
