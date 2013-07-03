/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "SDCardEvent.h"

namespace mozilla {
namespace dom {
namespace sdcard {

class SDCardRequestParent;

class IPCEvent : public SDCardEvent
{
public:
  IPCEvent(Worker* aWorker,
      SDCardRequestParent* aParent);
  virtual ~IPCEvent();

protected:
  virtual void OnError() MOZ_OVERRIDE;
  nsRefPtr<SDCardRequestParent> mParent;

private:
  void HandleResult() MOZ_OVERRIDE;
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
