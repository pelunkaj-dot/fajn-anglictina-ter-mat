# Fajn angličtina – Terezka a Matýsek

Plná dětská angličtina pro nejmenší školáky v rámci FajnCvičebny.

Navazuje na původní `ter-mat.html` v repozitáři `fdc-plugin`, který zůstává beze změny. Nová verze používá původní podobu Terezky a Matýska, ale staví kolem nich novou výukovou cestu, herní svět a mluvení.

## Verze 1.0

Výuková cesta:

**Nauč mě to → Poznám → Mluvím → Příběh → Ověřím si**

Každé téma kombinuje:

- obrazovou oporu pro dítě, které ještě čte pomalu,
- britskou anglickou výslovnost a poslech,
- vlastní mluvení přes mikrofon,
- kontrolu, zda bylo dítěti rozumět,
- krátký obrázkový příběh s Terezkou a Matýskem,
- roleplay,
- závěrečné obrazové a poslechové ověření,
- herní použití ve Výpravě za ztracenými hvězdami.

## Obsah

Aktuálně 12 základních dětských okruhů:

1. Colours
2. Animals
3. Food
4. Numbers 1–10
5. Body
6. Family
7. Clothes
8. House
9. School
10. Weather
11. Transport
12. Emotions

## Herní režim

- klikací svět Terezky a Matýska,
- témata odemykají konkrétní místa ve světě,
- z odemčeného místa lze rovnou spustit mini-výpravu nebo téma zopakovat,
- obrazové, poslechové i mluvené úkoly,
- cesta, checkpointy, poklad, série a rekord,
- žádné životy ani trestání dítěte za chybu,
- jemné zvukové odměny.

## Pro rodiče

Rodičovská sekce je chráněná čtyřmístným PINem a ukazuje:

- kolik témat dítě začalo,
- kolik jich opravdu zvládlo,
- postup v pěti krocích,
- stav rozpoznání mluvení,
- herní rekord,
- možnost resetovat postup.

Poznámka: hlasové hodnocení je založené na rozpoznání řeči. Ukazuje, zda systém dítěti rozuměl; není to odborná fonetická známka.

## Technika

- statická aplikace pro GitHub Pages,
- stav se ukládá do `localStorage`,
- TTS přes `fdc-gateway` s fallbackem na Web Speech API,
- pronunciation API přes `fdc-gateway/api/pronunciation`,
- bez závislosti na externím herním frameworku.

Veřejná pracovní verze:

https://pelunkaj-dot.github.io/fajn-anglictina-ter-mat/
