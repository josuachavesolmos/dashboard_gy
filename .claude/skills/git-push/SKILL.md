---
name: git-push
description: Sube los cambios del repositorio actual a GitHub. Usa este skill siempre que el usuario diga "sube los cambios", "push", "subir cambios", "sube esto", "manda los cambios", "actualiza el repo", "sube al repo", o cualquier variante que implique subir el trabajo actual al repositorio remoto. Tambien aplica cuando digan "commitea y sube", "guarda los cambios en github", o simplemente "sube".
---

# Git Push - Subir cambios al repositorio

Este skill automatiza el flujo completo de subir cambios a GitHub: staging, commit con mensaje auto-generado, y push a la rama actual.

## Flujo de trabajo

### Paso 1: Revisar el estado del repositorio

Ejecuta en paralelo:
- `git status` para ver archivos modificados, nuevos y eliminados
- `git diff` para ver el detalle de los cambios (staged y unstaged)
- `git log --oneline -5` para ver el estilo de los commits recientes del proyecto

Si no hay cambios pendientes, informa al usuario y detente.

### Paso 2: Generar el mensaje de commit

Analiza los cambios y genera un mensaje de commit conciso en espanol que:
- Resuma **que** se cambio y **por que** (en 1-2 lineas)
- Use el estilo de commits existente del repositorio si hay un patron claro
- Sea descriptivo pero breve (ej: "Agrega filtro de busqueda en dashboard de ventas")
- NO uses prefijos en ingles como "feat:", "fix:", etc., a menos que el repositorio ya los use

### Paso 3: Stage, commit y push

Ejecuta secuencialmente:

1. **Stage**: Agrega los archivos relevantes con `git add`. Prefiere agregar archivos especificos por nombre. Nunca incluyas archivos sensibles (.env, credenciales, tokens). Si hay muchos archivos modificados y todos son relevantes, usa `git add -A`.

2. **Commit**: Crea el commit con el mensaje generado. Usa HEREDOC para el formato:
```bash
git commit -m "$(cat <<'EOF'
Mensaje del commit aqui.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

3. **Push**: Ejecuta `git push` a la rama actual. Si la rama no tiene upstream, usa `git push -u origin <rama-actual>`.

4. **Verificacion**: Ejecuta `git status` para confirmar que todo quedo limpio.

### Paso 4: Confirmar al usuario

Muestra un resumen breve:
- Rama a la que se subio
- Numero de archivos modificados
- Mensaje del commit usado

## Consideraciones importantes

- Si hay conflictos de merge o el push es rechazado, informa al usuario y sugiere solucion (generalmente `git pull` primero).
- Nunca hagas `git push --force` sin autorizacion explicita del usuario.
- Si hay archivos que parecen sensibles (.env, .key, credentials.*, etc.), advierte al usuario antes de incluirlos.
- Si el repositorio no tiene remote configurado, informa al usuario y detente.
