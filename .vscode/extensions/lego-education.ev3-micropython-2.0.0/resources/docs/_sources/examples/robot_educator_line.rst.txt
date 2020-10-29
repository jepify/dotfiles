Line Following
=====================

This example project shows how you can make a robotic vehicle track a
line using
the :class:`ColorSensor <pybricks.ev3devices.ColorSensor>` and the 
:class:`.DriveBase` class. This works by adjusting the turn rate based on how
much the measured reflection deviates from the threshold value. The threshold
value is selected as the average of the line reflection and the reflection of
the surrounding surface.

.. rubric:: Building instructions

Click `here`_ to find all building instructions for the Educator Bot, or use
`this link`_ to go to the color sensor attachment directly.

.. _fig_robot_educator_line:

.. figure:: ../images/robot_educator_line.jpg
   :width: 80 %
   :align: center

   Robot Educator with the Color Sensor

.. rubric:: Example program

This example uses the track shown in :numref:`fig_map`, but you can adapt this
example to follow other lines as well. Download the
line following track using the link below and print print the required pages.
You can also create your own track by printing other pages.

:download:`Click to download the line following track. <../images/linefollowtiles.pdf>`

.. _fig_map:

.. figure:: ../images/line.png
   :width: 50 %
   :align: center

   Download the line following track and print pages
   ``2,2,2,2,3,3,3,3,11``.

.. literalinclude::
   ../../../pybricks-projects/official_models/ev3/education_core/robot_educator_line/main.py


.. _here: https://education.lego.com/en-us/support/mindstorms-ev3/building-instructions#robot
.. _this link: https://le-www-live-s.legocdn.com/sc/media/lessons/mindstorms-ev3/building-instructions/ev3-rem-color-sensor-down-driving-base-d30ed30610c3d6647d56e17bc64cf6e2.pdf
