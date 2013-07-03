/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/dom/sdcard/PSDCardRequestChild.h"
#include "Caller.h"

namespace mozilla {
namespace dom {
namespace sdcard {

class SDCardRequestChild :
  public PSDCardRequestChild
{
public:
  SDCardRequestChild();
  SDCardRequestChild(Caller* aCaller);
  ~SDCardRequestChild();

  virtual bool Recv__delete__(const SDCardResponseValue& value);

private:
  nsRefPtr<Caller> mCaller;
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
