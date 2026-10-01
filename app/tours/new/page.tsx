                  onClick={addDeparture}
                  className="mt-3 rounded-lg bg-brand-light px-4 py-2 text-sm font-medium text-brand-dark"
                >
                  + Dodaj prvi termin
                </button>
              </div>
            )}

            {departures.map((departure, index) => (
              <div
                key={index}
                className="rounded-xl border border-black/10 p-3"
              >
                <p className="mb-3 text-sm font-medium">
                  Termin {index + 1}
                </p>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Datum i vrijeme polaska *
                    </label>

                    <input
                      type="datetime-local"
                      value={departure.startsAt}
                      onChange={(e) =>
                        setDepartures((items) =>
                          items.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  startsAt: e.target.value,
                                }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Rezervacije i izmjene moguće do *
                    </label>

                    <input
                      type="datetime-local"
                      value={departure.bookingDeadline}
                      onChange={(e) =>
                        setDepartures((items) =>
                          items.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  bookingDeadline: e.target.value,
                                }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />

                    <p className="mt-1 text-[11px] text-foreground/45">
                      Poslije ovog vremena turista neće moći
                      napraviti novu niti izmijeniti postojeću
                      rezervaciju.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Slobodna mjesta *
                    </label>

                    <input
                      type="number"
                      min={1}
                      max={form.maxParticipants}
                      value={departure.spotsLeft}
                      onChange={(e) =>
                        setDepartures((items) =>
                          items.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  spotsLeft: Number(
                                    e.target.value
                                  ),
                                }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />

                    <p className="mt-1 text-[11px] text-foreground/45">
                      Maksimalno: {form.maxParticipants}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeDeparture(index)}
                  className="mt-3 text-xs text-red-500"
                >
                  Ukloni termin
                </button>
              </div>
            ))}

            <ErrorBox />

            <div className="mt-2 flex gap-2">
              <button type="button" onClick={cancel} disabled={loading} className="rounded-xl border border-red-200 px-4 py-3 text-sm text-red-500 disabled:opacity-50">✕ Odustani</button>
              <button type="button" onClick={() => goBack(2)} disabled={loading} className="flex-1 rounded-xl border border-black/10 py-3 text-sm text-foreground/70 disabled:opacity-50">← Nazad</button>
              <button type="button" onClick={submit} disabled={loading} className="flex-1 rounded-xl bg-brand py-3 text-sm font-medium text-white disabled:opacity-60">{loading ? "Objavljivanje..." : "✓ Objavi turu"}</button>
            </div>

            <p className="text-center text-[11px] text-foreground/40">
              * Obavezna polja
            </p>
          </div>
     );

