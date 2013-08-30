/* -*- Mode: c++; c-basic-offset: 2; indent-tabs-mode: nil; tab-width: 40 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_PromiseRunnable_h
#define mozilla_dom_PromiseRunnable_h

#include "nsISupports.h"

namespace mozilla {
namespace dom {

/*
 * PromiseRunnable is used for connecting an object to a C++ Promise.
 * A PromiseRunnable can be appended to a Promise using
 * Promise::AppendRunnable().
 */
class PromiseRunnable : public nsISupports
{
public:
  NS_DECL_ISUPPORTS

  virtual void ResolvedCallback(const Optional<JS::Handle<JS::Value> >& aValue) = 0;
  virtual void RejectedCallback(const Optional<JS::Handle<JS::Value> >& aValue) = 0;
};

} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_PromiseRunnable_h
