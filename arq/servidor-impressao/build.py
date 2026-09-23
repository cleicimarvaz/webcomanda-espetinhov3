import os
import escpos
import subprocess
import sys

# 1. O Python descobre sozinho onde a biblioteca escpos foi instalada no seu PC
pasta_escpos = os.path.dirname(escpos.__file__)

# 2. Preparamos o comando forçando a inclusão dessa pasta exata
# No Windows, o PyInstaller usa o ponto e vírgula (;) para separar origem e destino
parametro_add_data = f"{pasta_escpos};escpos"

print("Iniciando a compilação...")
print(f"Forçando a inclusão do arquivo capabilities a partir de:\n{pasta_escpos}\n")

# 3. Executamos o PyInstaller
comando = [
    sys.executable, "-m", "PyInstaller",
    "--noconsole",
    "--onefile",
    f"--add-data={parametro_add_data}",
    "servidor_impressao.py"
]

subprocess.run(comando)
print("\nConcluído! Verifique a pasta 'dist'.")
