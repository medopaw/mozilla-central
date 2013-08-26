/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Caller.h"
#include "mozilla/dom/DOMError.h"
#include "Error.h"
#include "Entry.h"
#include "Metadata.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

NS_IMPL_ADDREF(Caller)
NS_IMPL_RELEASE(Caller)

Caller::Caller(CallbackFunction* aSuccessCallback,
    ErrorCallback* aErrorCallback) :
    mSuccessCallback(aSuccessCallback),
    mErrorCallback(aErrorCallback)
{
  SDCARD_LOG("construct Caller");
}

Caller::Caller(CallbackFunction& aSuccessCallback,
      const Optional<OwningNonNull<ErrorCallback> >& aErrorCallback) :
      mSuccessCallback(&aSuccessCallback),
      mErrorCallback(nullptr)
{
  SDCARD_LOG("construct Caller");

  if (aErrorCallback.WasPassed()) {
    mErrorCallback = &(aErrorCallback.Value());
  }
}
/*
template <class T>
Caller::Caller(const Optional<OwningNonNull<T> >& aSuccessCallback,
      const Optional<OwningNonNull<ErrorCallback> >& aErrorCallback) :
      mSuccessCallback(nullptr),
      mErrorCallback(nullptr)
{
  SDCARD_LOG("construct Caller");

  if (aSuccessCallback.WasPassed()) {
    mSuccessCallback = &(aSuccessCallback.Value());
  }
  if (aErrorCallback.WasPassed()) {
    mErrorCallback = &(aErrorCallback.Value());
  }
}
*/

Caller::~Caller()
{
  SDCARD_LOG("destruct Caller");
}

void
Caller::CallErrorCallback(const nsAString& error)
{
  SDCARD_LOG("Call ErrorCallback with error=%s",
      NS_ConvertUTF16toUTF8(error).get());

  if (mErrorCallback) {
    nsRefPtr<DOMError> domError = Error::GetDOMError(error);
    ErrorResult rv;
    mErrorCallback->Call(*domError, rv);
  }
}

void
Caller::CallEntryCallback(const nsAString& path)
{
  SDCARD_LOG("Call EntryCallback with path=%s",
      NS_ConvertUTF16toUTF8(path).get());

  // Create an Entry from path.
  if (mSuccessCallback) {
    ErrorResult rv;
    static_cast<EntryCallback*>(mSuccessCallback.get())->Call(
        *(Entry::CreateFromRelpath(path)), rv);
  }
}

void
Caller::CallEntriesCallback(const InfallibleTArray<nsString>& paths)
{
  SDCARD_LOG("Call EntriesCalback");

  if (mSuccessCallback) {
    Sequence<OwningNonNull<Entry> > entries;
    int n = paths.Length();
    for (int i = 0; i < n; i++) {
      nsRefPtr<Entry> entry = Entry::CreateFromRelpath(paths[i]);
      *entries.AppendElement() = entry.forget();
    }

    ErrorResult rv;
    static_cast<EntriesCallback*>(mSuccessCallback.get())->Call(
        entries, rv);
  }
}

void
Caller::CallMetadataCallback(int64_t modificationTime, uint64_t size)
{
  SDCARD_LOG("Call MetadataCallback");

  if (mSuccessCallback) {
    nsRefPtr<Metadata> metadata = new Metadata();
    metadata->SetModificationTime(modificationTime);
    metadata->SetSize(size);

    ErrorResult rv;
    static_cast<MetadataCallback*>(mSuccessCallback.get())->Call(
        *metadata, rv);
  }
}

void
Caller::CallVoidCallback()
{
  SDCARD_LOG("Call VoidCallback");

  if (mSuccessCallback) {
    ErrorResult rv;
    static_cast<VoidCallback*>(mSuccessCallback.get())->Call(rv);
  }
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
