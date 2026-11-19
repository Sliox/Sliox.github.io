---
title: "Detector de fugas de aire comprimido"
description: "Simulación interactiva de un detector ultrasónico de fugas y calculadora del costo anual de cada fuga en una red de aire de planta."
tags:
  - "Simulación"
  - "Neumática"
  - "Eficiencia energética"
demo: "fugas-aire"
---

## Problema

En una planta, el aire comprimido mueve cilindros, válvulas, sopladoras y herramientas. Cada fuga en una unión,
manguera o conexión obliga al compresor a trabajar más para mantener la presión, y esa energía se paga aunque el
aire se escape. Con el ruido de la planta, la mayoría de las fugas no se escuchan, así que se acumulan sin que nadie
las detecte ni sepa cuánto cuestan.

## Qué construiría

Un detector portátil y de bajo costo:

- **Sensor:** un receptor ultrasónico de 40 kHz. El aire que escapa por un orificio pequeño genera turbulencia con
  mucha energía en esa frecuencia, que casi no se ve afectada por el ruido audible de la planta.
- **Electrónica:** amplificador y filtro pasa banda, y un microcontrolador (ESP32) que mide el nivel en dB.
- **Interfaz:** pantalla con el nivel y una barra, para acercarse a la fuga por la lectura más alta, como en la demo.
- **Estimación:** con la presión de la red y el tamaño aproximado del orificio, el equipo calcula el caudal perdido y
  su costo, para decidir qué reparar primero.

## Cómo funciona la demo

- **Escáner:** el nivel de cada fuga sube unos 6 dB al duplicar su diámetro y baja unos 6 dB al duplicar la
  distancia al sensor, sobre un ruido de fondo de 22 dB. Son valores **ilustrativos**: un sensor real se calibra
  con orificios de tamaño conocido.
- **Calculadora:** usa la ecuación de flujo crítico por un orificio, válida cuando la presión de la red supera
  ~0,9 bar, con aire a 20 °C y un coeficiente de descarga de 0,65:

  `caudal = Cd · A · p0 · 0,002361 / ρaire`

- **Supuestos editables:** horas de operación al año, precio de la energía (120 CLP/kWh por defecto) y consumo
  del compresor (0,11 kW por cada L/s, un valor típico para compresores de tornillo).

## Límites y próximos pasos

- Es una simulación: todavía no construyo el prototipo.
- El siguiente paso es armar el sensor y **calibrarlo** con orificios de 1, 2 y 3 mm a distintas presiones en un banco
  de pruebas, y comparar el caudal medido con el que estima la fórmula.
- Después, probarlo en una red neumática real y registrar las fugas encontradas con su costo estimado.
