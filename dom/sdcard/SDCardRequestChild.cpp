/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SDCardRequestChild.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SDCardRequestChild::SDCardRequestChild()
{
  SDCARD_LOG("in SDCardRequestChild's default constructor");
  MOZ_COUNT_CTOR(SDCardRequestChild);
}

SDCardRequestChild::SDCardRequestChild(Caller* aCaller) :
    mCaller(aCaller)
{
  SDCARD_LOG("construct SDCardRequestChild");
  MOZ_COUNT_CTOR(SDCardRequestChild);
}

SDCardRequestChild::~SDCardRequestChild()
{
  SDCARD_LOG("destruct SDCardRequestChild");
  MOZ_COUNT_DTOR(SDCardRequestChild);
}

bool
SDCardRequestChild::Recv__delete__(const SDCardResponseValue& aValue)
{
  SDCARD_LOG("in SDCardRequestChild.Recv__delete__()");

  switch (aValue.type()) {
  case SDCardResponseValue::TErrorResponse:
    {
      ErrorResponse r = aValue;
      SDCARD_LOG("ErrorResponse received with error=%s",
          NS_ConvertUTF16toUTF8(r.error()).get());
      mCaller->CallErrorCallback(r.error());
      break;
    }

  case SDCardResponseValue::TVoidResponse:
    {
      SDCARD_LOG("VoidResponse received");
      mCaller->Success(true);
      // mCaller->CallVoidCallback();
      break;
    }

  case SDCardResponseValue::TPathResponse:
    {
      PathResponse r = aValue;
      SDCARD_LOG("PathResponse received with path=%s",
          NS_ConvertUTF16toUTF8(r.path()).get());
      mCaller->CallEntryCallback(r.path());
      break;
    }

  case SDCardResponseValue::TPathsResponse:
    {
      PathsResponse r = aValue;
      SDCARD_LOG("PathsResponse received with %d paths", r.paths().Length());
      mCaller->CallEntriesCallback(r.paths());
      break;
    }

  case SDCardResponseValue::TMetadataResponse:
    {
      MetadataResponse r = aValue;
      SDCARD_LOG(
          "MetadataResponse received with modificationTime=%" PRIi64 ", size=%" PRIu64,
          r.modificationTime(), r.size());
      mCaller->CallMetadataCallback(r.modificationTime(), r.size());
      break;
    }

  default:
    {
      NS_RUNTIMEABORT("not reached");
      break;
    }
  }

  return true;
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
