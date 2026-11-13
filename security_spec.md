# Especificación de Seguridad Firestore

## 1. Invariantes de Datos
1. Toda evaluación en `/evaluations/{evaluationId}` pertenece estrictamente a un evaluador autenticado con correo verificado (`evaluatorId == request.auth.uid && request.auth.token.email_verified == true`).
2. Ningún usuario puede leer, listar, modificar o eliminar evaluaciones de otro evaluador (`resource.data.evaluatorId == request.auth.uid`).
3. Las evaluaciones registradas son inmutables una vez finalizadas (`allow update: if false`), protegiendo la integridad del veredicto (`passed`, `percentage`, `earnedPoints`). Solo pueden eliminarse por su propietario.
4. La marca de tiempo `createdAt` debe coincidir exactamente con `request.time`.
5. Los cálculos de aprobación siguen la regla `passed == (percentage >= 70)` y `earnedPoints <= totalPoints`.
6. Cada plantilla en `/rubrics/{rubricId}` solo puede ser leída o escrita por el propietario cuyo `uid == rubricId` y `ownerId == request.auth.uid`.
7. Todos los IDs cumplen `^[a-zA-Z0-9_\\-]+$` con longitud máxima de 128 caracteres, y todas las cadenas y arreglos tienen límites estrictos de tamaño.

## 2. "Dirty Dozen" Payloads (Pruebas Adversarias)
1. **Identity Spoofing**: `{ "evaluatorId": "otro_uid", ... }` -> PERMISSION_DENIED.
2. **Unverified Email**: Token con `email_verified: false` -> PERMISSION_DENIED.
3. **Ghost / Shadow Field**: Evaluación válida + `{ "isAdmin": true }` -> PERMISSION_DENIED (`hasOnly` bloquea campos extra).
4. **Client Timestamp Tampering**: `{ "createdAt": "2020-01-01T00:00:00Z" }` -> PERMISSION_DENIED (`createdAt == request.time`).
5. **Passing Score Forgery**: `{ "earnedPoints": 40, "totalPoints": 100, "percentage": 40, "passed": true }` -> PERMISSION_DENIED.
6. **ID Poisoning**: Path `/evaluations/../../evil` o ID > 128 chars -> PERMISSION_DENIED (`isValidId`).
7. **Denial of Wallet (1MB String)**: `{ "notes": "A".repeat(100000) }` -> PERMISSION_DENIED (`notes.size() <= 1000`).
8. **Unbounded Array**: `{ "items": [ ...50 items... ] }` -> PERMISSION_DENIED (`items.size() <= 35`).
9. **Wrong License Enum**: `{ "licenseCategory": "Z9" }` -> PERMISSION_DENIED.
10. **Cross-Tenant List**: `getDocs(collection(db, 'evaluations'))` sin filtro `where('evaluatorId', '==', uid)` -> PERMISSION_DENIED (`resource.data.evaluatorId == request.auth.uid`).
11. **Post-Exam Tampering**: `updateDoc` intentando cambiar `passed: true` en un examen reprobado -> PERMISSION_DENIED (`allow update: if false`).
12. **Rubric Hijack**: Escribir en `/rubrics/otro_uid` con `{ "ownerId": "mi_uid" }` -> PERMISSION_DENIED (`rubricId == request.auth.uid`).
