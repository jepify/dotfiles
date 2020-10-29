Obstacle Avoidance
=====================

This example project shows how you can make a robotic vehicle respond to its
environment using sensors. The robot drives at a given
speed until it detects an obstacle with the
:class:`UltrasonicSensor <pybricks.ev3devices.UltrasonicSensor>`. Then the
robot backs up, turns around, and continues driving until it detects a new
obstacle.

.. rubric:: Building instructions

Click `here`_ to find all building instructions for the Educator Bot, or use
`this link`_ to go to the ultrasonic sensor attachment directly.

.. _fig_robot_educator_ultrasonic:

.. figure:: ../images/robot_educator_ultrasonic.jpg
   :width: 80 %
   :align: center

   Robot Educator with the Ultrasonic Sensor

.. rubric:: Example program

.. literalinclude::
   ../../../pybricks-projects/official_models/ev3/education_core/robot_educator_ultrasonic/main.py

.. _here: https://education.lego.com/en-us/support/mindstorms-ev3/building-instructions#robot
.. _this link: https://le-www-live-s.legocdn.com/sc/media/lessons/mindstorms-ev3/building-instructions/ev3-ultrasonic-sensor-driving-base-61ffdfa461aee2470b8ddbeab16e2070.pdf
