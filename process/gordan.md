# Interview with Gordan Savičić

*Co-author of the [Critical Engineering Manifesto](https://criticalengineering.org/).*

**AIS is used for security and emergencies, but also for surveillance. It's an interesting technology for thinking about the desire to be seen, or to hide. When did you start experimenting with it?**

Nowadays there are more high-tech tools like GPS and Starlink, but AIS is still a powerful form of radio communication that works point to point. Once, we managed to hack an AIS transmitter and pretended to be Jeff Bezos's yacht. It was only in the local area though. It didn't show up on MarineTraffic. I thought I would have been in trouble otherwise.

**Occupying the radio spectrum requires an amateur radio licence, which technically lets you transmit a message anywhere in the world. You have one. What made you get it? I've been looking into old QSL cards, and they're very beautiful objects…**

Even though I've been working on this for a long time, there's still some magic in seeing what an antenna does. I wanted to be able to legally transmit information through these objects. And yes, QSL cards are very beautiful things. I got really passionate about them because I love hiking, and there were people transmitting their call signs only from mountain peaks. Quite cool!

Passing the amateur radio exam to get a call sign was almost a performative act, really. I went to the official building in Bienne, Switzerland, to take the exam alongside lots of older people. It was all still pen and paper; only a calculator was allowed. It was quite funny and old-fashioned. I passed, but to be honest I've never transmitted my call sign on the radio.

My friends make fun of me, saying that if all communication networks went down, I'd be their point of contact with the rest of the world. But I think if all communication networks were down, there would be a much bigger problem than transmitting call signs to other people.

**Did you choose your call sign, HB3XAX?**

No, it's assigned through an official Swiss protocol.

**A beautiful property of radio communication is that, being analogue, it can only be intercepted at the moment of transmission, if somebody happens to be listening. This is why decentralisation, and sometimes acts of resistance, are tied to this medium: it's hard to trace. I'm looking into how people use radio signals for these purposes. Do you have any examples?**

Well, amateur transmissions are sometimes encoded, but not encrypted. That's why they're amateur.

The mesh network community is much more serious about encryption. The [Reticulum](https://reticulum.network/) crypto mesh network, for example, can run over any carrier (TCP/IP, FM radio…) and encrypts the information. The person who invented it runs it as a one-man show, which is either destined to pick up and grow a community around it, or disappear forever. I think they may also have sold the software to NATO, so that might be worth looking into.

Another concept you might be interested in is the **sneakernet**: sharing information over smaller, human networks — I hand you a hard disk, for instance. These rely on personal protocols and small devices, and they're a way of injecting parasitic information into a larger network.

**You're organising a project called *Islands of Conviviality*, on a sailing boat around the Croatian islands. What does it involve?**

The core of the project is to build a solar-powered web server — one solar panel and one battery. That way, the website is up when the sun is up and goes down at night. The idea is to investigate not being online and connected 24/7, but only when resources are available. We'll also run talks and discussions on the topic, and build more tools while on board.

It's hard to run a project on a sailing boat, though. The conditions are tough: everything is moving all the time, the battery runs down, and people also have to manoeuvre the boat and handle the sails.

**In 2022 you explored the "antenna zoo" in *Antenna Fieldguide* with Selena Savić at the Museum für Kommunikation in Berlin, and you've done a lot of work across the city to make radio infrastructure more perceptible. What are your best findings about antennas? How do you build a good one?**

Building an antenna depends on what you want to listen to, but generally, the longer it is, the lower the frequency it picks up. Its shape determines its directionality — a single spike is a monopole; a cross-shaped or two-armed antenna, like those used for AIS, is a dipole.

**Have you ever transmitted signals over a very long distance?**

Yes. Once we built an antenna out of a very long wire — a pain to set up — using 20 W of power, and we could send a signal around 300 km away.

Even more interesting, I'd say, is **QRP**, the practice of sending signals as far as possible with as little power as possible. I think that's a good paradigm for long-range communication, which uses the Earth's ionosphere to extend the signal.

**How do you envision the electromagnetic spectrum?**

There are a number of works investigating this, and I tend to see it from different perspectives. One is the very technical one: frequency allocation tables, with different visualisations for different frequencies. I've also built field guides myself, falling into the trap of categorisation.

In my work, though, I try to visualise the spectrum through its infrastructures — the concrete elements that make it up, like antennas. Visualising something can mean making the infrastructure more understandable, or making its vulnerabilities more visible, as with the Jeff Bezos AIS hack. Critical work needs critical actions.

You might be interested in the **RTL-SDR**, a dongle you plug into your computer. Through software, it basically does what a crystal radio did in the past. Depending on the antenna you build, you can listen to all kinds of signals. The software itself is a bit of a black box, though.

## References

- **Mapping the EM spectrum:** [Frequensea](https://enigmeta.com/projects/2015-frequensea/) and [Visualizing the electromagnetic spectrum with Frequensea and an RTL-SDR](https://www.rtl-sdr.com/visualizing-the-electromagnetic-spectrum-with-frequensea-and-an-rtl-sdr/)
- **Reticulum:** [reticulum.network](https://reticulum.network/), and [Reticulum over shortwave radio](https://github.com/RFnexus/reticulum-over-hf)
- **A newsletter of obscure radio things:** [Experimental Radio News](https://www.experimentalradio.news/)
- **An old-school atlas of the EM spectrum:** [Atlas de l'espace électromagnétique (Libération)](https://www.liberation.fr/ecrans/2008/03/20/zoom-atlas-de-l-espace-electromagnetique_952453/)
- **A collective feminist approach:** [Open Weather](https://open-weather.community/)
