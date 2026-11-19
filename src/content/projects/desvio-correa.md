---
title: "Visión artificial para el desvío de correas transportadoras"
description: "Simulación 3D de una correa transportadora que se desvía, con una cámara que mide el desvío analizando la imagen y un control PI que lo corrige."
tags:
  - "Simulación"
  - "Visión artificial"
  - "Correas transportadoras"
  - "Control"
image: "/images/desvio-correa.jpg"
demo: "correa-3d"
---

## Problema

Cuando una correa transportadora se corre hacia un lado, el borde roza la estructura, se desgasta y se rompe, y el
mineral se derrama por el costado. Las causas típicas son un polín desalineado, la carga que cae descentrada desde
el chute o material pegado en las poleas. Hoy se detecta a ojo durante las rondas, o con interruptores de
desalineamiento que solo avisan cuando el desvío ya es grande.

## Qué construiría

Un sistema de bajo costo que mida el desvío de forma continua:

- **Cámara** sobre la correa, cerca de la cabeza, con una placa clara debajo para tener buen contraste.
- **Raspberry Pi** con **OpenCV**: en cada imagen busca los dos bordes de la correa, calcula su centro y lo compara
  con el centro de la estructura para obtener el desvío en milímetros.
- **Alarmas** por umbral (advertencia y alarma) hacia el **PLC** de la correa, por una salida digital o Modbus.
- **Opcional:** un polín autoalineante motorizado que el PLC gira para recentrar la correa con un control PI.

## Cómo funciona la simulación

- **Escena 3D** hecha con [Three.js](https://threejs.org): estructura, polines, poleas, tolva, correa de retorno y
  mineral. El giro de los polines se dibuja **4 veces exagerado** para que se note.
- **Desvío de la correa:** un modelo simplificado de primer orden, `dy/dt = V·(Ks·θ + Kl·carga) − Kc·y`. El desvío
  crece con la velocidad, con el ángulo del polín desalineado y con la carga descentrada, y el abarquillamiento y
  las poleas tienden a recentrar la correa. Los coeficientes son **ilustrativos**: con un polín girado 1° a 3 m/s,
  la correa se estabiliza unos 25 mm corrida.
- **Visión de verdad, sobre imagen sintética:** una cámara virtual renderiza la vista superior (480 × 120 píxeles,
  unos 3 mm por píxel). El código lee esos píxeles, busca en tres filas el paso de la placa clara a la correa
  oscura con un umbral adaptativo, interpola los bordes con precisión sub-píxel y calcula el desvío. No usa la
  posición "real" de la simulación: por eso se muestran las dos y puedes compararlas.
- **Control:** con la corrección automática, un control PI gira el polín autoalineante (el de color menta) según
  el desvío **medido por la cámara**, igual que lo haría el PLC.
- **Derrame:** sobre unos 60 mm de desvío, el mineral que va cerca del borde empieza a caer de la correa.

## Límites y próximos pasos

- Es una simulación: el modelo de deriva no reemplaza un análisis de la dinámica real de la correa, y la imagen
  sintética no tiene polvo, vibración ni cambios de luz, que son lo difícil en terreno.
- El siguiente paso es montar la cámara y la Raspberry Pi sobre una **maqueta de correa**, calibrar milímetros por
  píxel con una regla y probar la detección con polvo y distintas iluminaciones.
- Después, conectar la salida de alarma a un PLC y medir cuánto antes avisa que un interruptor de desalineamiento.
