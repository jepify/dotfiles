Gyro Boy
============

This program makes Gyro Boy balance on its two wheels using the
:class:`GyroSensor <pybricks.ev3devices.GyroSensor>`. The duty cycle of the
motors is continuously adjusted as a function of the gyro angle, the gyro
speed, the motor angles, and the motor speeds, in order to maintain balance.

This program also uses a
Python generator function (a function that uses yield instead of return) as
a coroutine. Coroutines are a form of cooperative multitasking that allows the
robot perform multiple tasks at the same time. This lets you drive it around
while it is busy balancing.

.. rubric:: Building instructions

Click `here`_ to find all building instructions for the Core Set Models, or use
`this link`_ to go to Gyro Boy directly.

.. _fig_gyro_boy:

.. figure:: ../images/gyro_boy.jpg
   :width: 80 %
   :align: center

   Gyro Boy

.. rubric:: Example program

.. literalinclude::
   ../../../pybricks-projects/official_models/ev3/education_core/gyro_boy/main.py

.. _here: https://education.lego.com/en-us/support/mindstorms-ev3/building-instructions#building-core
.. _this link: https://le-www-live-s.legocdn.com/sc/media/lessons/mindstorms-ev3/building-instructions/ev3-model-core-set-gyro-boy-f8a14d8e3d0e63fa23b87f798bf197f4.pdf
