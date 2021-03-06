/* -*- Mode: c++; c-basic-offset: 2; indent-tabs-mode: nil; tab-width: 40 -*- */
/* vim: set ts=2 et sw=2 tw=40: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

interface TelephonyCallGroup : EventTarget {
  readonly attribute CallsList calls;

  [Throws]
  void add(TelephonyCall call);

  [Throws]
  void add(TelephonyCall call, TelephonyCall secondCall);

  [Throws]
  void remove(TelephonyCall call);

  [Throws]
  void hold();

  [Throws]
  void resume();

  readonly attribute DOMString state;

  [SetterThrows]
  attribute EventHandler onstatechange;
  [SetterThrows]
  attribute EventHandler onconnected;
  [SetterThrows]
  attribute EventHandler onholding;
  [SetterThrows]
  attribute EventHandler onheld;
  [SetterThrows]
  attribute EventHandler onresuming;
  [SetterThrows]
  attribute EventHandler oncallschanged;
};
