# Tramoya

Motor de aventuras gráficas de Studio LXD. Como la tramoya de un teatro, es la
maquinaria que no se ve: mueve las escenas, guarda el progreso y habla con el
LMS. No pinta nada ni trae estilos: cada juego lo viste con su propio sistema
de diseño.

## Qué incluye

| Parte | API |
|---|---|
| Flujo de escenas, portada opcional (`titleScene`, `hasProgress`, `start`), transiciones con telón, pausa, perfil del jugador | `createGame` → `GameProvider`, `useGame`, `CurrentScene`, `isSceneId` |
| Progreso en SCORM 1.2 (reanudar, puntuación, estado), xAPI opcional y si hay LMS (`inLms`) | `createTracking` |
| Textos adaptados a la forma de tratamiento | `GenderedText`, `resolveText` |
| Comportamiento y accesibilidad, sin marcado | `useStageScale`, `useTypewriter`, `useDialogue`, `useSwipe`, `useAutoFocus`, `useMediaQuery`, `usePortrait`, `useReducedMotion`, `useCoarsePointer` |
| Utilidades | `shuffle`, `withViewTransition` |
| Paquete SCORM 1.2 del build | CLI `tramoya scorm --title "…"` |
| Imágenes provisionales (PNG) | `@studiolxd/tramoya/placeholders` (necesita `sharp`) |

## Uso en un juego

```ts
// src/game/tracking.ts
export const tracking = createTracking({
  dev: import.meta.env.DEV,
  baseUrl: import.meta.env.BASE_URL,
  language: 'es-ES',
  mockActivityIriBase: 'https://example.com/xapi/mi-juego',
})

// src/game/game.ts
export const { GameProvider, useGame, CurrentScene, isSceneId } = createGame<SceneId>({
  progressWeight: { intro: 0, plaza: 1, final: 1 },
  initialScene: () => 'intro',
  transitionMs: 450,
  tracking,
})
```

`CurrentScene` va dentro del escenario del juego, y `curtainClosed` (de
`useGame`) controla su telón, que debe animarse durante `transitionMs`.

En desarrollo (`dev: true`): `?lms=local` instala un LMS SCORM 1.2 en
`localStorage` para probar la reanudación (`?lms=reset` lo borra) y
`?xapi=mock` envía las sentencias xAPI a un LRS en memoria.

## Instalación

Cada versión se publica como release de GitHub con el paquete compilado:

```sh
pnpm add https://github.com/studiolxd/tramoya/releases/download/v0.4.0/studiolxd-tramoya-0.4.0.tgz
```

Para desarrollar Tramoya y un juego a la vez, enlaza la copia local desde el
juego (`pnpm add @studiolxd/tramoya@link:../libs/tramoya`) y ejecuta
`pnpm build` en Tramoya tras cada cambio. Antes de subir el juego, vuelve a la
URL de la release.

## Publicar una versión

1. Sube `version` en `package.json` y haz commit.
2. `git tag v0.2.0 && git push origin main --tags`
3. El workflow `Release` compila, empaqueta y crea la release con el `.tgz`.
