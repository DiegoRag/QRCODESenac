# Projeto QR Code

## Configuração do Ambiente

1. Certifique-se de ter Python 3.11+ instalado
2. Clone este repositório
3. Crie um ambiente virtual:
```powershell
python -m venv venv
```

4. Instale as dependências:
```powershell
.\venv\Scripts\pip.exe install -r requirements.txt
```

## Executando o Servidor

Para executar o servidor de desenvolvimento:

```powershell
.\venv\Scripts\python.exe server.py
```

O servidor estará disponível em http://127.0.0.1:5000

## Estrutura do Projeto

- `server.py`: Servidor Flask principal
- `static/`: Arquivos estáticos (CSS, HTML, JavaScript)
- `data/`: Diretório para armazenamento de dados
- `requirements.txt`: Lista de dependências Python