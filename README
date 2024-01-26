# Studienprojekt für das Fach Digitale Karten

Aufgabe war es, eine Kartendatengestützte Datenvisualisierung mit hilfe des Tools MapBox zu entwickeln.

## Idee

Die Visualisierung zeigt eine Karte von Deutschland, aufgeteilt in die verschiedenen Postleitzahlbereiche. Die Farbcodierung trennt Deutschland in Bereiche von 00000 bis 09999, 10000 bis 19999 usw. ein. Die Extrusionen aus jedem PLZ-Bereich in die dritte Dimension visualisieren die Menge an Einwohner\*innen pro Postleitzahl.

## Umsetzung

### Datensammlung

Der Datensatz wurde kombiniert aus einem GeoJSON-Datensatz der PLZ-Daten an Koordinaten bindet und einem CSV-Datensatz der Einwohner\*innenzahlen an PLZs bindet.
Die Daten wurden mit QGIS verarbeitet und mit Mapshaper verkleinert, damit MapBox die Daten verarbeiten konnte.

In einer früheren Version des Projekts waren noch Informationen über die Höhe über N.N. der jeweiligen PLZ angedacht, dafür wurde ein Skript geschrieben, um die Daten aus Wikipedia auszulesen. Die Daten befinden sich auch im Datensatz, werden aber jetzt nicht mehr verwendet.

### Coding

Umgesetzt wurde die Karte mit MapBox Studio und MapBox GL JS. In Studio wurden die Datensätze hochgeladen und in Ebenen verarbeitet, mit JavaScript wurde dann Interaktivität eingebaut.
