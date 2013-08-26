/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"

#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"
#include "mozilla/dom/Future.h"

#include "Entry.h"

struct JSContext;

namespace mozilla {
namespace dom {

class EntriesCallback;

class CreateFileOptions;
class DestinationDict;
class FileSystemFlags;

class StringOrDirectory;

namespace sdcard {

class Caller;
struct FileInfo;

class Directory MOZ_FINAL : public Entry
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(Directory)

public:
  explicit Directory(const FileInfo& aInfo);

  ~Directory();

  virtual JSObject* WrapObject(JSContext* aCx, JS::Handle<JSObject*> aScope);

  // already_AddRefed<DirectoryReader> CreateReader();

  void CreateFile(JSContext* cx, const nsAString& path, const CreateFileOptions& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void CreateDirectory(const nsAString& path,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Get(const nsAString& path,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Rename (const nsAString& oldName, const nsAString& newName,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Move(const StringOrDirectory& path, const nsAString& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Move(const StringOrDirectory& path,
      mozilla::dom::sdcard::Directory& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Move(const StringOrDirectory& path,
      const DestinationDict& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Copy(const StringOrDirectory& path, const nsAString& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Copy(const StringOrDirectory& path,
      mozilla::dom::sdcard::Directory& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Copy(const StringOrDirectory& path,
      const DestinationDict& dest,
      EntryCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Remove(const nsAString& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void Remove(mozilla::dom::sdcard::Directory& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void RemoveDeep(const nsAString& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void RemoveDeep(mozilla::dom::sdcard::Directory& entry, VoidCallback& successCallback,
      const Optional<OwningNonNull<ErrorCallback> >& errorCallback);

  void GetFile(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  already_AddRefed<mozilla::dom::Future> GetFile(const nsAString& path,
      const FileSystemFlags& options);

  void GetDirectory(const nsAString& path, const FileSystemFlags& options,
      const Optional< OwningNonNull<EntryCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void Enumerate (const Optional<nsAString >& path,
      const Optional< OwningNonNull<EntriesCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

  void EnumerateDeep (const Optional<nsAString >& path,
      const Optional< OwningNonNull<EntriesCallback> >& successCallback,
      const Optional< OwningNonNull<ErrorCallback> >& errorCallback);

private:
  bool GetEntryRelpath(const StringOrDirectory& path, nsString& entryRelpath,
      Caller* pCaller);

  void CopyMoveInternal(const nsString& entryRelpath,
      const nsString& parentRelpath, const nsString& newName, bool isCopy,
      Caller* pCaller, bool undecided = false);

  void GetInternal(const nsAString& path, bool aCreate, bool aExclusive,
      bool aTruncate, Caller* pCaller, bool isFile = true,
      const JS::Value* aContent = nullptr);

  void EnumerateInternal(const Optional<nsAString >& path, bool aDeep,
      Caller* pCaller);

  void RemoveInternal(const nsAString& path, bool deep, Caller* pCaller);
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
