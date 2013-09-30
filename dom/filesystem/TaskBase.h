/*
 * TaskBase.h
 *
 *  Created on: Sep 29, 2013
 *      Author: yuan
 */

#ifndef mozilla_dom_taskbase_h__
#define mozilla_dom_taskbase_h__

#include "nsThreadUtils.h"
#include "mozilla/dom/filesystem/PFilesystemRequestChild.h"
#include "mozilla/ErrorResult.h"

namespace mozilla {
namespace dom {

class FilesystemParams;
class Promise;

namespace filesystem {

class FilesystemRequestParent;

class TaskBase : public nsRunnable, public PFilesystemRequestChild
{
public:
  TaskBase();
  TaskBase(FilesystemRequestParent* aParent);

  virtual ~TaskBase();

  already_AddRefed<Promise> GetPromise(ErrorResult& aRv);

  // Overrides nsIRunnable.
  NS_IMETHOD Run() MOZ_OVERRIDE;

protected:
  virtual void Work() = 0;
  virtual void HandlerCallback() = 0;

  virtual FilesystemParams GetRequestParams() = 0;
  virtual FilesystemResponseValue GetRequestResult() = 0;
  virtual void SetRequestResult(const FilesystemResponseValue& aValue) = 0;

  // Overrides PFilesystemRequestChild
  virtual bool Recv__delete__(const FilesystemResponseValue& value) MOZ_OVERRIDE;

  nsRefPtr<Promise> mPromise;
private:
  void Start();
  void HandleResult();

  void SetError(const nsAString& aErrorName);
  void SetError(const nsresult& aErrorCode);

  nsRefPtr<FilesystemRequestParent> mRequestParent;
  // Only used on main thread. Don't need a lock.
  nsCOMPtr<nsIThread> mWorkerThread;
};

}
}
}

#endif // mozilla_dom_taskbase_h__
